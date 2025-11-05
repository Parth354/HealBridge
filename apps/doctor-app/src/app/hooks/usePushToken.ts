import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { useNotifications } from './useNotifications'

export default function usePushToken() {
  const { registerToken } = useNotifications()

  useEffect(() => {
    (async () => {
      const settings = await Notifications.getPermissionsAsync()
      if (!settings.granted) await Notifications.requestPermissionsAsync()
      const token = (await Notifications.getExpoPushTokenAsync()).data
      if (token) registerToken(token)
    })()
  }, [])
}

