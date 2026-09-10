import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CreneauxScreen from '../screens/CreneauxScreen';
import MedicamentsScreen from '../screens/MedicamentsScreen';
import DispositifScreen from '../screens/DispositifScreen';
import ResultScreen from '../screens/ResultScreen';
import RemplissageScreen from '../screens/RemplissageScreen';
import DemoScreen from '../screens/DemoScreen';

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef();

const optionsEcran = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.cream },
};

export default function AppNavigator() {
  const { estConnecte, pret } = useAuth();

  if (!pret) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={optionsEcran}>
        {estConnecte ? (
          <>
            <Stack.Screen name="TableauDeBord" component={DashboardScreen} />
            <Stack.Screen name="Creneaux" component={CreneauxScreen} options={{ headerShown: true, title: 'Mes moments de prise' }} />
            <Stack.Screen name="Medicaments" component={MedicamentsScreen} options={{ headerShown: true, title: 'Mes médicaments' }} />
            <Stack.Screen name="Dispositif" component={DispositifScreen} options={{ headerShown: true, title: 'Mon dispositif' }} />
            <Stack.Screen name="Resultat" component={ResultScreen} options={{ headerShown: true, title: 'Résultat' }} />
            <Stack.Screen name="Remplissage" component={RemplissageScreen} options={{ headerShown: true, title: 'Remplissage hebdomadaire' }} />
            <Stack.Screen name="Demo" component={DemoScreen} options={{ headerShown: true, title: 'Démonstration en direct' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Connexion" component={LoginScreen} />
            <Stack.Screen name="Inscription" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  chargement: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
});
