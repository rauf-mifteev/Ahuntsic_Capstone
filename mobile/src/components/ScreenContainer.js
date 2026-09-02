import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';

/** Fond et marges communs à tous les écrans, pour éviter de les répéter. */
export default function ScreenContainer({ children, scroll = true }) {
  const Contenu = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Contenu
          style={styles.flex}
          contentContainerStyle={scroll ? styles.scrollContent : styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </Contenu>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing.lg },
  content: { flex: 1, padding: spacing.lg },
});
