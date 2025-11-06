import React from 'react'
import QueryProvider from './app/providers/QueryProvider'
import I18nProvider from './app/providers/I18nProvider'
import AuthProvider from './app/providers/AuthProvider'
import RootNav from './app/navigation'

export default function Root() {
  return (
    <I18nProvider>
      <AuthProvider>
        <QueryProvider>
          <RootNav />
        </QueryProvider>
      </AuthProvider>
    </I18nProvider>
  )
}

