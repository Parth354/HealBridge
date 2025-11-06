import axios from 'axios'

export const API_BASE =
  (globalThis as any).EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:8080/api'

export const http = axios.create({ baseURL: API_BASE })

let token: string | null = null
export const setAuthToken = (t: string | null) => {
  token = t
  if (t) http.defaults.headers.common.Authorization = `Bearer ${t}`
  else delete http.defaults.headers.common.Authorization
}
export const getAuthToken = () => token
