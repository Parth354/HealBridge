import { useMutation } from '@tanstack/react-query'
import { http } from '../http'

export function useRagQuery() {
  return useMutation({
    mutationFn: async (p: { patientId: string; question: string }) =>
      (await http.post('/rag/query', p)).data
  })
}
