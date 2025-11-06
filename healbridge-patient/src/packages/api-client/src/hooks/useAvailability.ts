import { useQuery } from '@tanstack/react-query'
import { http } from '../http'
import type { Slot } from '../types'

export function useAvailability(params: { doctorId: string; clinicId: string; date: string }) {
  return useQuery({
    queryKey: ['availability', params],
    queryFn: async () =>
      (await http.get<Slot[]>(
        `/doctors/${params.doctorId}/availability`,
        { params }
      )).data
  })
}
