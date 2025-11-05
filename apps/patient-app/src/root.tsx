import React from 'react'
import QueryProvider from './app/providers/QueryProvider'
import I18nProvider from './app/providers/I18nProvider'
import ThemeProvider from './app/providers/ThemeProvider'
import AuthProvider from './app/providers/AuthProvider'
import VoiceProvider from './app/providers/VoiceProvider'
import NavRoot from './app/navigation'
export default function Root() {
  return (
    <I18nProvider>
      <AuthProvider>
        <QueryProvider>
          <ThemeProvider>
            <VoiceProvider>
              <NavRoot/>
            </VoiceProvider>
          </ThemeProvider>
        </QueryProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
