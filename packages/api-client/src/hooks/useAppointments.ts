import { useMutation } from '@tanstack/react-query'
import { http } from '../http'
import type { Hold } from '../types'

export function useCreateHold() {
  return useMutation({
    mutationFn: async (p: { doctor_id: string; clinic_id: string; start_ts: string; end_ts: string }) =>
      (await http.post<Hold>('/appointments/hold', p)).data
  })
}

export function useConfirmFromHold() {
  return useMutation({
    mutationFn: async ({ holdId }: { holdId: string }) =>
      (await http.post('/appointments/confirm', { holdId })).data
  })
}
