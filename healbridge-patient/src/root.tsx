import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Create a minimal stack for testing
const Stack = createNativeStackNavigator();

// Minimal screen component
function HomeScreen() {
  return <View style={{ flex: 1, backgroundColor: 'white' }} />;
}

// Simple root component
export default function Root() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure native modules are initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: 'white' }} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
