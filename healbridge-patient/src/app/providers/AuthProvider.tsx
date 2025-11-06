// src/app/providers/AuthProvider.tsx
import React, { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const clearAuth = useAuthStore(state => state.clear);

  // Clear auth state on mount (during development)
  useEffect(() => {
    clearAuth();
  }, []);

  return children;
}
