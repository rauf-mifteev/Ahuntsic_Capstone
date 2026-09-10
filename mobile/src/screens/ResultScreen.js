import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import { obtenirPrise, confirmerPrise, annulerConfirmationPrise } from '../api/priseApi';
import { obtenirMonDispositif } from '../api/dispositifApi';
import { listerMedicaments } from '../api/medicamentApi';
import { messageErreur } from '../api/client';
import { colors, spacing, radius } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const APPARENCE = {
  CONFIRMEE: {
    cls: 'ok',
    couleur: colors.sage,
    fond: colors.sageBg,
    icone: 'checkmark-circle',
    titre: 'Prise confirmée',
    sousTitre: 'Le médicament est sorti de la case. Bien joué.',
  },
  AMBIGUE: {
    cls: 'warn',
    couleur: colors.amberDeep,
    fond: colors.amberGlow,
    icone: 'help-circle',
    titre: "On n'est pas certain",
    sousTitre: 'La photo ne permet pas de conclure. Avez-vous pris votre médicament ?',
  },
  EN_VERIFICATION: {
    cls: 'bad',
    couleur: colors.clay,
    fond: colors.clayBg,
    icone: 'close-circle',
    titre: 'Case encore pleine',
    sousTitre: 'Le médicament ne semble pas avoir été pris.',
  },
  MANQUEE: {
    cls: 'bad',
    couleur: colors.clay,
    fond: colors.clayBg,
    icone: 'close-circle',
    titre: 'Prise manquée',
    sousTitre: "Le délai prévu pour cette prise est passé sans confirmation.",
  },
};

export default function ResultScreen({ route, navigation }) {
  const { priseId } = route.params;

  const [prise, setPrise] = useState(null);
  const [medicamentsConcernes, setMedicamentsConcernes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const [priseChargee, dispositif, medicaments] = await Promise.all([
        obtenirPrise(priseId),
        obtenirMonDispositif(),
        listerMedicaments(),
      ]);
      setPrise(priseChargee);

      const compartiment = dispositif.compartiments.find((c) => c.indice === priseChargee.compartimentIndice);
      if (compartiment) {
        setMedicamentsConcernes(
          medicaments.filter(
            (m) => m.creneau === compartiment.creneau && m.joursSemaine.includes(compartiment.jourSemaine)
          )
        );
      }
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [priseId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function confirmer() {
    setEnCours(true);
    try {
      const priseMiseAJour = await confirmerPrise(priseId);
      setPrise(priseMiseAJour);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  async function indiquerNonPris() {
    setEnCours(true);
    try {
      const priseMiseAJour = await annulerConfirmationPrise(priseId);
      setPrise(priseMiseAJour);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  if (chargement || !prise) return null;

  const apparence = APPARENCE[prise.statut] || APPARENCE.EN_VERIFICATION;
  const nomsMedicaments = medicamentsConcernes.map((m) => m.nom).join(', ');

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.centre}>
        <View style={[styles.cercleIcone, { backgroundColor: apparence.fond }]}>
          <Ionicons name={apparence.icone} size={56} color={apparence.couleur} />
        </View>

        <Text style={styles.titre}>{apparence.titre}</Text>
        {nomsMedicaments ? <Text style={styles.medicaments}>{nomsMedicaments}</Text> : null}
        <Text style={styles.sousTitre}>{apparence.sousTitre}</Text>

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        {prise.statut === 'CONFIRMEE' && (
          <PrimaryButton label="Fermer" onPress={() => navigation.goBack()} />
        )}

        {prise.statut === 'AMBIGUE' && (
          <View style={styles.rangeeBoutons}>
            <PrimaryButton label="Non, pas pris" variant="secondary" onPress={indiquerNonPris} loading={enCours} />
            <PrimaryButton label="Oui, je l'ai pris" onPress={confirmer} loading={enCours} />
          </View>
        )}

        {(prise.statut === 'EN_VERIFICATION' || prise.statut === 'PREVUE') && (
          <PrimaryButton label="Recommencer la vérification" variant="secondary" onPress={charger} loading={enCours} />
        )}

        {prise.statut === 'MANQUEE' && (
          <PrimaryButton label="Fermer" variant="secondary" onPress={() => navigation.goBack()} />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  cercleIcone: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  titre: { fontFamily: fonts.heading, fontSize: fontSizes.h1, color: colors.ink, textAlign: 'center' },
  medicaments: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.body,
    color: colors.inkSoft,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sousTitre: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  erreur: { fontFamily: fonts.bodyMedium, color: colors.clay, marginBottom: spacing.md, textAlign: 'center' },
  rangeeBoutons: { width: '100%' },
});
