// src/app/providers/QueryProvider.tsx
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const qc = new QueryClient()
export default function QueryProvider({ children }: any) { return <QueryClientProvider client={qc}>{children}</QueryClientProvider> }
