import { useMutation } from '@tanstack/react-query'
import { http } from '../http'

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: async (p: { deviceToken: string; platform: 'ios' | 'android' }) =>
      (await http.post('/devices/register', p)).data
  })
}
