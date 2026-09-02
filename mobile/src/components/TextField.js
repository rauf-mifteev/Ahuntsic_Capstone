import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

/**
 * Champ de texte accessible : étiquette toujours visible (pas seulement un
 * placeholder qui disparaît), grande zone de saisie, message d'erreur en
 * texte (pas seulement en couleur) — voir R-09 / WCAG 2.1 AA.
 */
export default function TextField({ label, error, style, ...props }) {
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputErreur]}
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        accessibilityLabel={label}
        {...props}
      />
      {error ? <Text style={styles.erreur}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.small,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.ink,
    minHeight: 48, // zone à toucher large (R-09)
  },
  inputErreur: { borderColor: colors.clay },
  erreur: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.small,
    color: colors.clay,
    marginTop: spacing.xs,
  },
});
