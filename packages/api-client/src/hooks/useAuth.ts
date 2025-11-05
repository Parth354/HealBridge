import { useMutation } from '@tanstack/react-query'
import { http } from '../http'
import type { VerifyOtpResponse } from '../types'

export function useRequestOtp() {
  return useMutation({
    mutationFn: async ({ phone }: { phone: string }) =>
      (await http.post('/auth/otp', { phone })).data
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) =>
      (await http.post<VerifyOtpResponse>('/auth/verify', { phone, code })).data
  })
}
