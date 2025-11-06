import React, { PropsWithChildren, useEffect } from 'react'
import { useAuthStore } from '../store/auth.store'
import { useAuth } from '../hooks/useAuth'
import usePushToken from '../hooks/usePushToken'

export default function AuthProvider({ children }: PropsWithChildren) {
  const { token, setAuth, clear } = useAuthStore()
  const { refresh } = useAuth()
  usePushToken()

  useEffect(() => {
    // Try refresh token on app start
    refresh().then((res) => {
      if (res?.token) setAuth(res.token, res.user)
      else clear()
    }).catch(clear)
  }, [])

  return <>{children}</>
}

