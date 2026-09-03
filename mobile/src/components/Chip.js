import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

/** Petite étiquette sélectionnable, utilisée pour les jours de la semaine et les créneaux. */
export default function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.base, selected && styles.selectionne]}
    >
      <Text style={[styles.texte, selected && styles.texteSelectionne]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  selectionne: { backgroundColor: colors.sageBg, borderColor: colors.sage },
  texte: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.small, color: colors.inkSoft },
  texteSelectionne: { color: colors.sage, fontFamily: fonts.bodySemiBold },
});
