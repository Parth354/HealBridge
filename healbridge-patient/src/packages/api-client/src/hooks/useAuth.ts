import { useMutation } from '@tanstack/react-query'
import { http } from '../http'
import type { VerifyOtpResponse } from '../types'

export function useRequestOtp() {
  return useMutation<void, Error, { phone: string }>({
    mutationFn: async ({ phone }) => {
      await http.post('/auth/otp', { phone })
    }
  })
}

export function useVerifyOtp() {
  return useMutation<VerifyOtpResponse, Error, { phone: string; code: string }>({
    mutationFn: async ({ phone, code }) =>
      (await http.post<VerifyOtpResponse>('/auth/verify', { phone, code })).data
  })
}
