import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://inovdbudrzicbgkcnbpd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlub3ZkYnVkcnppY2Jna2NuYnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDY1NzEsImV4cCI6MjA5NjgyMjU3MX0.fBJ418qpVpnGusbFPV9_GriTF2OttI7-lCHdLUxZbZU',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
)
