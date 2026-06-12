-- ============================================================
-- LIMAY iREPORT SYSTEM — Supabase SQL Migration
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- 1. OFFICES
create table if not exists public.offices (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  office_type   text not null check (office_type in ('barangay','pnp','mswd','munisipyo')),
  address       text,
  contact_number text,
  created_at    timestamptz not null default now()
);

-- 2. PROFILES (one row per Supabase Auth user)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null default 'New User',
  role          text not null default 'encoder' check (role in ('super_admin','encoder','viewer')),
  office_id     uuid references public.offices(id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3. CASES
create table if not exists public.cases (
  id                    uuid primary key default gen_random_uuid(),
  case_number           text unique,
  case_type             text not null check (case_type in ('vawc','blotter','referral','incident')),
  status                text not null default 'open' check (status in ('open','ongoing','resolved','referred','closed')),
  priority_level        text not null default 'medium' check (priority_level in ('low','medium','high','urgent')),
  date_filed            date not null default current_date,
  date_of_incident      date,
  time_of_incident      time,
  is_confidential       boolean not null default false,
  filed_by_office_id    uuid references public.offices(id) on delete set null,
  assigned_to_office_id uuid references public.offices(id) on delete set null,
  created_by_user_id    uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- 4. AUTO-INCREMENT CASE NUMBER trigger
create sequence if not exists public.case_number_seq start 1;

create or replace function public.generate_case_number()
returns trigger language plpgsql as $$
begin
  new.case_number := 'LIM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.case_number_seq')::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists trg_case_number on public.cases;
create trigger trg_case_number
  before insert on public.cases
  for each row
  when (new.case_number is null)
  execute function public.generate_case_number();

-- 5. VICTIMS
create table if not exists public.victims (
  id                          uuid primary key default gen_random_uuid(),
  case_id                     uuid not null references public.cases(id) on delete cascade,
  last_name                   text not null,
  first_name                  text not null,
  middle_name                 text,
  age                         integer check (age >= 0 and age <= 150),
  sex                         text check (sex in ('male','female','other')),
  civil_status                text check (civil_status in ('single','married','widowed','separated','live-in')),
  birthdate                   date,
  address_barangay            text,
  address_municipality        text not null default 'Limay',
  address_province            text not null default 'Bataan',
  contact_number              text,
  occupation                  text,
  relationship_to_respondent  text,
  created_at                  timestamptz not null default now()
);

-- 6. RESPONDENTS
create table if not exists public.respondents (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases(id) on delete cascade,
  last_name       text,
  first_name      text,
  middle_name     text,
  age             integer check (age >= 0 and age <= 150),
  sex             text check (sex in ('male','female','other')),
  address         text,
  contact_number  text,
  occupation      text,
  is_known        boolean not null default true,
  created_at      timestamptz not null default now()
);

-- 7. CASE NARRATIVES
create table if not exists public.case_narratives (
  id                   uuid primary key default gen_random_uuid(),
  case_id              uuid not null references public.cases(id) on delete cascade,
  narrative_text       text not null,
  written_by_user_id   uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now()
);

-- 8. CASE ATTACHMENTS
create table if not exists public.case_attachments (
  id                    uuid primary key default gen_random_uuid(),
  case_id               uuid not null references public.cases(id) on delete cascade,
  file_name             text not null,
  file_url              text not null,
  file_type             text,
  file_size             bigint,
  uploaded_by_user_id   uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now()
);

-- 9. CASE STATUS LOGS
create table if not exists public.case_status_logs (
  id                    uuid primary key default gen_random_uuid(),
  case_id               uuid not null references public.cases(id) on delete cascade,
  old_status            text,
  new_status            text not null,
  changed_by_user_id    uuid references auth.users(id) on delete set null,
  notes                 text,
  created_at            timestamptz not null default now()
);

-- 10. REFERRALS
create table if not exists public.referrals (
  id                    uuid primary key default gen_random_uuid(),
  case_id               uuid not null references public.cases(id) on delete cascade,
  from_office_id        uuid not null references public.offices(id) on delete restrict,
  to_office_id          uuid not null references public.offices(id) on delete restrict,
  referral_reason       text,
  referral_date         date not null default current_date,
  received_at           timestamptz,
  received_by_user_id   uuid references auth.users(id) on delete set null,
  status                text not null default 'sent' check (status in ('sent','received','acknowledged','completed')),
  notes                 text,
  created_at            timestamptz not null default now()
);

-- 11. NOTIFICATIONS
create table if not exists public.notifications (
  id                    uuid primary key default gen_random_uuid(),
  recipient_office_id   uuid references public.offices(id) on delete cascade,
  recipient_user_id     uuid references auth.users(id) on delete cascade,
  case_id               uuid references public.cases(id) on delete cascade,
  message               text not null,
  type                  text not null check (type in ('new_case','referral_received','referral_update','status_change')),
  is_read               boolean not null default false,
  created_at            timestamptz not null default now()
);

-- ============================================================
-- 12. handle_new_user() TRIGGER
-- Automatically creates a profiles row when a new user signs up
-- in Supabase Auth. New users default to role = 'encoder'.
-- Admin must then assign office_id and optionally change role.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'encoder'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 13. updated_at TRIGGER (cases + profiles)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_cases_updated_at on public.cases;
create trigger trg_cases_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 14. STORAGE BUCKET for case attachments
-- ============================================================
insert into storage.buckets (id, name, public)
values ('case-attachments', 'case-attachments', false)
on conflict (id) do nothing;

-- ============================================================
-- 15. ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.offices          enable row level security;
alter table public.profiles         enable row level security;
alter table public.cases            enable row level security;
alter table public.victims          enable row level security;
alter table public.respondents      enable row level security;
alter table public.case_narratives  enable row level security;
alter table public.case_attachments enable row level security;
alter table public.case_status_logs enable row level security;
alter table public.referrals        enable row level security;
alter table public.notifications    enable row level security;

-- Helper: is the caller a super_admin?
create or replace function public.is_super_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and is_active = true
  )
$$;

-- Helper: is the caller an encoder or above?
create or replace function public.is_encoder_or_above()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('encoder','super_admin') and is_active = true
  )
$$;

-- OFFICES: all authenticated users can read; super_admin can write
drop policy if exists "offices_select" on public.offices;
create policy "offices_select" on public.offices for select to authenticated using (true);
drop policy if exists "offices_write" on public.offices;
create policy "offices_write" on public.offices for all to authenticated using (public.is_super_admin());

-- PROFILES: users can read all profiles; users can update own; super_admin full access
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid());
drop policy if exists "profiles_admin" on public.profiles;
create policy "profiles_admin" on public.profiles for all to authenticated using (public.is_super_admin());

-- CASES: all active users can read and create; encoders+ can update; super_admin full
drop policy if exists "cases_select" on public.cases;
create policy "cases_select" on public.cases for select to authenticated using (true);
drop policy if exists "cases_insert" on public.cases;
create policy "cases_insert" on public.cases for insert to authenticated with check (public.is_encoder_or_above());
drop policy if exists "cases_update" on public.cases;
create policy "cases_update" on public.cases for update to authenticated using (public.is_encoder_or_above());
drop policy if exists "cases_delete" on public.cases;
create policy "cases_delete" on public.cases for delete to authenticated using (public.is_super_admin());

-- Sub-tables: follow same pattern as cases
drop policy if exists "victims_all" on public.victims;
create policy "victims_all" on public.victims for select to authenticated using (true);
drop policy if exists "victims_write" on public.victims;
create policy "victims_write" on public.victims for all to authenticated using (public.is_encoder_or_above());

drop policy if exists "respondents_all" on public.respondents;
create policy "respondents_all" on public.respondents for select to authenticated using (true);
drop policy if exists "respondents_write" on public.respondents;
create policy "respondents_write" on public.respondents for all to authenticated using (public.is_encoder_or_above());

drop policy if exists "narratives_all" on public.case_narratives;
create policy "narratives_all" on public.case_narratives for select to authenticated using (true);
drop policy if exists "narratives_write" on public.case_narratives;
create policy "narratives_write" on public.case_narratives for all to authenticated using (public.is_encoder_or_above());

drop policy if exists "attachments_select" on public.case_attachments;
create policy "attachments_select" on public.case_attachments for select to authenticated using (true);
drop policy if exists "attachments_write" on public.case_attachments;
create policy "attachments_write" on public.case_attachments for all to authenticated using (public.is_encoder_or_above());

drop policy if exists "status_logs_select" on public.case_status_logs;
create policy "status_logs_select" on public.case_status_logs for select to authenticated using (true);
drop policy if exists "status_logs_write" on public.case_status_logs;
create policy "status_logs_write" on public.case_status_logs for all to authenticated using (public.is_encoder_or_above());

drop policy if exists "referrals_select" on public.referrals;
create policy "referrals_select" on public.referrals for select to authenticated using (true);
drop policy if exists "referrals_write" on public.referrals;
create policy "referrals_write" on public.referrals for all to authenticated using (public.is_encoder_or_above());

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select to authenticated
  using (recipient_user_id = auth.uid() or recipient_office_id in (
    select office_id from public.profiles where id = auth.uid()
  ));
drop policy if exists "notifications_write" on public.notifications;
create policy "notifications_write" on public.notifications for all to authenticated using (true);

-- Storage: authenticated users can upload/download case attachments
drop policy if exists "attachments_storage_select" on storage.objects;
create policy "attachments_storage_select" on storage.objects for select to authenticated
  using (bucket_id = 'case-attachments');
drop policy if exists "attachments_storage_insert" on storage.objects;
create policy "attachments_storage_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'case-attachments' and public.is_encoder_or_above());

-- ============================================================
-- 16. ENABLE REALTIME on key tables
-- (Run these only once; they're idempotent via supabase_realtime)
-- ============================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.cases;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.referrals;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.case_status_logs;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.case_narratives;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.case_attachments;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when others then null; end;
end $$;

-- ============================================================
-- 17. SEED — Sample offices for Municipality of Limay
-- ============================================================
insert into public.offices (name, office_type, address) values
  ('Municipal Social Welfare and Development Office (MSWDO)', 'mswd', 'Municipal Hall, Limay, Bataan'),
  ('Limay Municipal Police Station', 'pnp', 'Poblacion, Limay, Bataan'),
  ('Barangay Poblacion', 'barangay', 'Poblacion, Limay, Bataan'),
  ('Barangay Alangan', 'barangay', 'Alangan, Limay, Bataan'),
  ('Barangay Bilolo', 'barangay', 'Bilolo, Limay, Bataan'),
  ('Barangay Duale', 'barangay', 'Duale, Limay, Bataan'),
  ('Barangay Lote', 'barangay', 'Lote, Limay, Bataan'),
  ('Barangay Pag-asa', 'barangay', 'Pag-asa, Limay, Bataan'),
  ('Barangay Reformista', 'barangay', 'Reformista, Limay, Bataan'),
  ('Barangay San Francisco de Asis', 'barangay', 'San Francisco de Asis, Limay, Bataan'),
  ('Barangay Saysain', 'barangay', 'Saysain, Limay, Bataan'),
  ('Barangay Wawa', 'barangay', 'Wawa, Limay, Bataan'),
  ('Barangay Builder', 'barangay', 'Builder, Limay, Bataan'),
  ('Office of the Mayor', 'munisipyo', 'Municipal Hall, Limay, Bataan')
on conflict do nothing;

-- ============================================================
-- DONE. Next steps:
-- 1. Create your first user in Supabase Auth > Users > Add User
-- 2. The handle_new_user trigger auto-creates their profiles row (role=encoder)
-- 3. Go to Admin Panel > User Management and set their role to super_admin
-- 4. That super_admin can then create and manage all other users
-- ============================================================
