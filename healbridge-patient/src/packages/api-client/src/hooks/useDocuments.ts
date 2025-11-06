import { useMutation } from '@tanstack/react-query'
import { http } from '../http'

export function useUploadDocument() {
  return useMutation({
    mutationFn: async (p: { patientId: string; uri: string }) =>
      (await http.post('/documents', p)).data
  })
}
