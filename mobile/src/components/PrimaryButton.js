import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

export default function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary' }) {
  const estSecondaire = variant === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        estSecondaire ? styles.secondaire : styles.primaire,
        (disabled || loading) && styles.desactive,
        pressed && !disabled && !loading && styles.presse,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={estSecondaire ? colors.ink : colors.white} />
      ) : (
        <Text style={[styles.texte, estSecondaire ? styles.texteSecondaire : styles.textePrimaire]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50, // zone à toucher large (R-09)
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  primaire: { backgroundColor: colors.ink },
  secondaire: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  desactive: { opacity: 0.5 },
  presse: { opacity: 0.85 },
  texte: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.body },
  textePrimaire: { color: colors.white },
  texteSecondaire: { color: colors.ink },
});
