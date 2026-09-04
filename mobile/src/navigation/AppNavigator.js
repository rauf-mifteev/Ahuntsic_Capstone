import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CreneauxScreen from '../screens/CreneauxScreen';
import MedicamentsScreen from '../screens/MedicamentsScreen';
import DispositifScreen from '../screens/DispositifScreen';

const Stack = createNativeStackNavigator();

const optionsEcran = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.cream },
};

/**
 * Deux piles de navigation distinctes selon l'état d'authentification :
 * un patient déconnecté ne peut techniquement pas atteindre un écran qui
 * suppose un compte (F1, "une page protégée refuse l'accès"). Les autres
 * écrans (Créneaux, Médicaments, Dispositif...) sont ajoutés à la pile
 * "connecté" au fur et à mesure des tâches suivantes du sprint.
 */
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
    <NavigationContainer>
      <Stack.Navigator screenOptions={optionsEcran}>
        {estConnecte ? (
          <>
            <Stack.Screen name="TableauDeBord" component={DashboardScreen} />
            <Stack.Screen name="Creneaux" component={CreneauxScreen} options={{ headerShown: true, title: 'Mes moments de prise' }} />
            <Stack.Screen name="Medicaments" component={MedicamentsScreen} options={{ headerShown: true, title: 'Mes médicaments' }} />
            <Stack.Screen name="Dispositif" component={DispositifScreen} options={{ headerShown: true, title: 'Mon dispositif' }} />
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
