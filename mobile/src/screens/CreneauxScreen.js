import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import PrimaryButton from '../components/PrimaryButton';
import { obtenirMonDispositif, mettreAJourPlagesHoraires } from '../api/dispositifApi';
import { messageErreur } from '../api/client';
import { colors, spacing, radius } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const REGEX_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const LIBELLES_CRENEAU = ['Matin', 'Midi', 'Soir', 'Coucher'];

/**
 * F2 — attribuer une heure à chacun des 4 créneaux fixes de la journée.
 * (RG-10 : impossible d'en avoir un 5e — l'écran n'affiche que 4 champs,
 * la règle est donc respectée par construction plutôt que vérifiée.)
 */
export default function CreneauxScreen({ navigation }) {
  const [plages, setPlages] = useState([1, 2, 3, 4].map((creneau) => ({ creneau, heure: '' })));
  const [erreurs, setErreurs] = useState({});
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurGenerale, setErreurGenerale] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const dispositif = await obtenirMonDispositif();
      setPlages(dispositif.plagesHoraires.map((p) => ({ creneau: p.creneau, heure: p.heure || '' })));
    } catch (err) {
      setErreurGenerale(messageErreur(err));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  function changerHeure(creneau, valeur) {
    setPlages((precedent) => precedent.map((p) => (p.creneau === creneau ? { ...p, heure: valeur } : p)));
  }

  function valider() {
    const nouvellesErreurs = {};
    plages.forEach((p) => {
      if (p.heure && !REGEX_HEURE.test(p.heure)) {
        nouvellesErreurs[p.creneau] = 'Format attendu : HH:mm (ex. 08:00)';
      }
    });
    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  }

  async function enregistrer() {
    setErreurGenerale('');
    if (!valider()) return;

    setEnregistrement(true);
    try {
      await mettreAJourPlagesHoraires(plages.map((p) => ({ creneau: p.creneau, heure: p.heure || null })));
      navigation.goBack();
    } catch (err) {
      setErreurGenerale(messageErreur(err));
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) return null; // ScreenContainer garde le fond crème pendant le chargement bref

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>Traitement</Text>
      <Text style={styles.titre}>Mes moments de prise</Text>
      <Text style={styles.sousTitre}>
        Quatre créneaux fixes par jour. Laissez un champ vide si vous ne l'utilisez pas.
      </Text>

      {plages.map((p, i) => (
        <View key={p.creneau} style={styles.carteCreneau}>
          <Text style={styles.numeroCreneau}>Créneau {p.creneau}</Text>
          <TextField
            label={LIBELLES_CRENEAU[i]}
            value={p.heure}
            onChangeText={(valeur) => changerHeure(p.creneau, valeur)}
            placeholder="HH:mm, ex. 08:00"
            keyboardType="numbers-and-punctuation"
            error={erreurs[p.creneau]}
          />
        </View>
      ))}

      {erreurGenerale ? <Text style={styles.erreurGenerale}>{erreurGenerale}</Text> : null}

      <PrimaryButton label="Enregistrer" onPress={enregistrer} loading={enregistrement} />
      <PrimaryButton label="Annuler" variant="secondary" onPress={() => navigation.goBack()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.amberDeep,
    marginBottom: spacing.xs,
  },
  titre: { fontFamily: fonts.heading, fontSize: fontSizes.h1, color: colors.ink, marginBottom: 6 },
  sousTitre: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.inkSoft,
    marginBottom: spacing.lg,
  },
  carteCreneau: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  numeroCreneau: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.sage,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  erreurGenerale: {
    fontFamily: fonts.bodyMedium,
    color: colors.clay,
    marginBottom: spacing.sm,
    fontSize: fontSizes.small,
  },
});
