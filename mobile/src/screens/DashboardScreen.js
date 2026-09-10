import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { listerPrisesDuJour } from '../api/priseApi';
import { obtenirMonDispositif } from '../api/dispositifApi';
import { listerMedicaments } from '../api/medicamentApi';
import { creneauxDe } from '../api/creneaux';
import { planifierRappelsPourAujourdhui } from '../notifications/planificateur';
import { colors, spacing, radius } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const BADGE_PAR_STATUT = {
  PREVUE: { texte: 'À venir', couleur: colors.inkSoft, fond: colors.creamDim, icone: 'time-outline' },
  EN_VERIFICATION: { texte: 'En cours', couleur: colors.amberDeep, fond: colors.amberGlow, icone: 'eye-outline' },
  AMBIGUE: { texte: 'À confirmer', couleur: colors.amberDeep, fond: colors.amberGlow, icone: 'help-circle-outline' },
  CONFIRMEE: { texte: 'Confirmée', couleur: colors.sage, fond: colors.sageBg, icone: 'checkmark-circle-outline' },
  MANQUEE: { texte: 'Manquée', couleur: colors.clay, fond: colors.clayBg, icone: 'close-circle-outline' },
};

export default function DashboardScreen({ navigation }) {
  const { utilisateur, deconnecter } = useAuth();
  const [prises, setPrises] = useState([]);
  const [infosParCompartiment, setInfosParCompartiment] = useState({});

  useFocusEffect(
    useCallback(() => {
      let ignorer = false;

      (async () => {
        try {
          const [prisesDuJour, dispositif, medicaments] = await Promise.all([
            listerPrisesDuJour(),
            obtenirMonDispositif(),
            listerMedicaments(),
          ]);
          if (ignorer) return;

          setPrises(prisesDuJour);

          const parCompartiment = {};
          dispositif.compartiments.forEach((c) => {
            const noms = medicaments
              .filter((m) => creneauxDe(m).includes(c.creneau) && m.joursSemaine.includes(c.jourSemaine))
              .map((m) => m.nom)
              .join(', ');
            parCompartiment[c.indice] = { noms, creneau: c.creneau };
          });
          setInfosParCompartiment(parCompartiment);

          planifierRappelsPourAujourdhui(prisesDuJour, parCompartiment).catch((err) => {

            // eslint-disable-next-line no-console
            console.warn('Rappels non programmés :', err?.message || err);
          });
        } catch (err) {
          // Chargement du tableau de bord : erreur ignorée volontairement,
          // l'écran reste utilisable même si prises/dispositif/médicaments
          // ne se chargent pas (ex. hors-ligne).

        }
      })();

      return () => {
        ignorer = true;
      };
    }, [])
  );

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>Tableau de bord</Text>
      <Text style={styles.titre}>Bonjour</Text>
      <Text style={styles.sousTitre}>{utilisateur?.courriel}</Text>

      {prises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Aujourd’hui</Text>
          {prises.map((prise) => {
            const badge = BADGE_PAR_STATUT[prise.statut] || BADGE_PAR_STATUT.PREVUE;
            return (
              <Pressable
                key={prise.id}
                style={styles.lignePrise}
                onPress={() => navigation.navigate('Resultat', { priseId: prise.id })}
              >
                <View style={[styles.badge, { backgroundColor: badge.fond }]}>
                  <Ionicons name={badge.icone} size={18} color={badge.couleur} />
                </View>
                <View style={styles.ligneTexte}>
                  <Text style={styles.ligneNom}>
                    {infosParCompartiment[prise.compartimentIndice]?.noms || 'Médicament'}
                  </Text>
                  <Text style={[styles.ligneStatut, { color: badge.couleur }]}>{badge.texte}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.carte}>
        <Text style={styles.carteTitre}>Prochaine étape</Text>
        <Text style={styles.carteTexte}>
          Configurez vos moments de prise et vos médicaments, puis associez votre pilulier.
        </Text>
        <PrimaryButton
          label="Configurer mon traitement"
          onPress={() => navigation.navigate('Creneaux')}
        />
        <PrimaryButton
          label="Mes médicaments"
          variant="secondary"
          onPress={() => navigation.navigate('Medicaments')}
        />
        <PrimaryButton
          label="Associer mon pilulier"
          variant="secondary"
          onPress={() => navigation.navigate('Dispositif')}
        />
        <PrimaryButton
          label="Confirmer le remplissage hebdomadaire"
          variant="secondary"
          onPress={() => navigation.navigate('Remplissage')}
        />
        <PrimaryButton
          label="Démonstration en direct"
          variant="secondary"
          onPress={() => navigation.navigate('Demo')}
        />
      </View>

      <PrimaryButton label="Se déconnecter" variant="secondary" onPress={deconnecter} />
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
  titre: { fontFamily: fonts.heading, fontSize: fontSizes.h1, color: colors.ink },
  sousTitre: { fontFamily: fonts.body, color: colors.inkSoft, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitre: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.body, color: colors.ink, marginBottom: spacing.sm },
  lignePrise: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  badge: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  ligneTexte: { flex: 1 },
  ligneNom: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.small, color: colors.ink },
  ligneStatut: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label, marginTop: 1 },
  carte: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  carteTitre: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.body, color: colors.ink, marginBottom: 6 },
  carteTexte: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.inkSoft, marginBottom: spacing.md },
});
