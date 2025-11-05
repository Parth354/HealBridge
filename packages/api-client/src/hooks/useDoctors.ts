import { useQuery } from '@tanstack/react-query'
import { http } from '../http'
import type { Doctor } from '../types'

export function useDoctors(params: { specialty: string; lat: number; lon: number; radiusKm: number }) {
  return useQuery({
    queryKey: ['doctors', params],
    queryFn: async () => (await http.get<Doctor[]>('/doctors/search', { params })).data
  })
}
