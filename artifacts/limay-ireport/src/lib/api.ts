const SUPA_URL = 'https://inovdbudrzicbgkcnbpd.supabase.co'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlub3ZkYnVkcnppY2Jna2NuYnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDY1NzEsImV4cCI6MjA5NjgyMjU3MX0.fBJ418qpVpnGusbFPV9_GriTF2OttI7-lCHdLUxZbZU'
const SESSION_STORAGE_KEY = 'sb-inovdbudrzicbgkcnbpd-auth-token'

function getToken(): string {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return ANON_KEY
    const parsed = JSON.parse(raw) as { access_token?: string }
    return parsed.access_token ?? ANON_KEY
  } catch {
    return ANON_KEY
  }
}

function makeSignal(ms = 12_000): AbortSignal {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), ms)
  return ctrl.signal
}

function dbHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export interface GetResult<T> {
  data: T | null
  count: number | undefined
  error: string | null
}

export async function dbGet<T = unknown[]>(
  table: string,
  params: URLSearchParams,
  withCount = false
): Promise<GetResult<T>> {
  const url = `${SUPA_URL}/rest/v1/${table}?${params.toString()}`
  try {
    const res = await fetch(url, {
      signal: makeSignal(),
      headers: dbHeaders(withCount ? { Prefer: 'count=exact' } : {}),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { data: null, count: undefined, error: txt }
    }
    const txt = await res.text()
    const data = txt ? (JSON.parse(txt) as T) : null
    let count: number | undefined
    if (withCount) {
      const range = res.headers.get('content-range')
      if (range) {
        const parts = range.split('/')
        count = parts[1] ? parseInt(parts[1]) : 0
      }
    }
    return { data, count, error: null }
  } catch (e: unknown) {
    return { data: null, count: undefined, error: e instanceof Error ? e.message : 'Request failed' }
  }
}

export interface MutateResult<T> {
  data: T | null
  error: string | null
}

export async function dbInsert<T = unknown[]>(
  table: string,
  body: Record<string, unknown> | Record<string, unknown>[]
): Promise<MutateResult<T>> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: 'POST',
      signal: makeSignal(),
      headers: dbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { data: null, error: txt }
    }
    const txt = await res.text()
    return { data: txt ? (JSON.parse(txt) as T) : null, error: null }
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e.message : 'Request failed' }
  }
}

export async function dbUpdate<T = unknown[]>(
  table: string,
  filterParams: URLSearchParams,
  body: Record<string, unknown>
): Promise<MutateResult<T>> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filterParams.toString()}`, {
      method: 'PATCH',
      signal: makeSignal(),
      headers: dbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { data: null, error: txt }
    }
    const txt = await res.text()
    return { data: txt ? (JSON.parse(txt) as T) : null, error: null }
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e.message : 'Request failed' }
  }
}

export async function dbDelete(
  table: string,
  filterParams: URLSearchParams
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filterParams.toString()}`, {
      method: 'DELETE',
      signal: makeSignal(),
      headers: dbHeaders(),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { error: txt }
    }
    return { error: null }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Request failed' }
  }
}

export async function storageUpload(
  bucket: string,
  path: string,
  file: File
): Promise<{ data: { path: string } | null; error: string | null }> {
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      signal: makeSignal(30_000),
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    })
    if (!res.ok) {
      const txt = await res.text()
      return { data: null, error: txt }
    }
    return { data: { path }, error: null }
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e.message : 'Upload failed' }
  }
}

export async function storageSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 60
): Promise<{ data: { signedUrl: string } | null; error: string | null }> {
  try {
    const res = await fetch(`${SUPA_URL}/storage/v1/object/sign/${bucket}/${path}`, {
      method: 'POST',
      signal: makeSignal(),
      headers: dbHeaders(),
      body: JSON.stringify({ expiresIn }),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { data: null, error: txt }
    }
    const json = await res.json() as { signedURL?: string; signedUrl?: string }
    const raw = json.signedURL ?? json.signedUrl ?? ''
    const signedUrl = raw.startsWith('http') ? raw : `${SUPA_URL}${raw}`
    return { data: { signedUrl }, error: null }
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to get signed URL' }
  }
}
