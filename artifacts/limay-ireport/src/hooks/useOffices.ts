import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Office } from '@/types'

export function useOffices() {
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('offices')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setOffices((data ?? []) as Office[])
        setLoading(false)
      })
  }, [])

  return { offices, loading }
}
