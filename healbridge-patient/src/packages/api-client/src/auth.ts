import { http } from './http'
import type { VerifyOtpResponse } from './types'

export async function requestOtp(phone: string) {
  return http.post('/auth/otp', { phone }).then(r => r.data)
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  return http.post('/auth/verify', { phone, code }).then(r => r.data)
}

export async function logout() {
  return http.post('/auth/logout').then(r => r.data)
}