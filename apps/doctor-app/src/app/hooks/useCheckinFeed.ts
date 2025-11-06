import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function useCheckinFeed(appointmentId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['today-list'] })
      if (appointmentId) qc.invalidateQueries({ queryKey: ['waittime', appointmentId] })
    }, 30_000)
    return () => clearInterval(t)
  }, [appointmentId])
}

