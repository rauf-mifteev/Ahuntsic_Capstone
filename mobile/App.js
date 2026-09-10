import { LogBox } from 'react-native';
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { demanderPermissionNotifications, ecouterActivationNotification } from './src/notifications/planificateur';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [polices] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });

  const surLayout = useCallback(async () => {
    if (polices) await SplashScreen.hideAsync();
  }, [polices]);

  useEffect(() => {
    demanderPermissionNotifications().catch(() => {});
    const abonnement = ecouterActivationNotification();
    return () => abonnement.remove();
  }, []);

  if (!polices) return null;

  return (
    <View style={{ flex: 1 }} onLayout={surLayout}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </View>
  );
}