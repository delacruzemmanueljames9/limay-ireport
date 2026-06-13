import { useState, useEffect } from 'react'
import { dbGet } from '@/lib/api'
import type { Office } from '@/types'

export function useOffices() {
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({ select: '*', order: 'name.asc' })
    dbGet<Office[]>('offices', params).then(({ data }) => {
      setOffices(data ?? [])
      setLoading(false)
    })
  }, [])

  return { offices, loading }
}
