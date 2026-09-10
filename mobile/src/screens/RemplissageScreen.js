import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import { confirmerRemplissage } from '../api/dispositifApi';
import { obtenirDerniereReference } from '../api/verificationApi';
import { obtenirMonDispositif } from '../api/dispositifApi';
import { listerMedicaments } from '../api/medicamentApi';
import { creneauxDe } from '../api/creneaux';
import { messageErreur } from '../api/client';
import { colors, spacing, radius } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const DELAI_SONDAGE_MS = 3000;
const DUREE_MAX_ATTENTE_MS = 2 * 60 * 1000;

export default function RemplissageScreen({ navigation }) {
  const [etape, setEtape] = useState('avant');
  const [zonesVides, setZonesVides] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const momentConfirmationRef = useRef(null);

  useEffect(() => {
    if (etape !== 'attente') return undefined;

    const debut = Date.now();
    const intervalle = setInterval(async () => {
      if (Date.now() - debut > DUREE_MAX_ATTENTE_MS) {
        clearInterval(intervalle);
        setEtape('expire');
        return;
      }

      try {
        const verification = await obtenirDerniereReference();
        const estNouvelle =
          verification && new Date(verification.moment) >= momentConfirmationRef.current;
        if (!estNouvelle) return;

        clearInterval(intervalle);
        const zones = await calculerZonesEncoreVides(verification);
        setZonesVides(zones);
        setEtape('resultat');
      } catch (err) {
        // Sondage périodique : erreur ignorée volontairement, on
        // retentera automatiquement au prochain intervalle.

      }
    }, DELAI_SONDAGE_MS);

    return () => clearInterval(intervalle);
  }, [etape]);

  async function calculerZonesEncoreVides(verification) {
    const [dispositif, medicaments] = await Promise.all([obtenirMonDispositif(), listerMedicaments()]);

    const zonesConcernees = [];
    dispositif.compartiments.forEach((compartiment) => {
      const medicamentsDuCompartiment = medicaments.filter(
        (m) => creneauxDe(m).includes(compartiment.creneau) && m.joursSemaine.includes(compartiment.jourSemaine)
      );
      if (medicamentsDuCompartiment.length === 0) return;

      const zone = verification.etatsZones.find((z) => z.indice === compartiment.indice);
      if (zone && zone.occupee === false) {
        zonesConcernees.push({
          indice: compartiment.indice,
          jourSemaine: compartiment.jourSemaine,
          creneau: compartiment.creneau,
          noms: medicamentsDuCompartiment.map((m) => m.nom).join(', '),
        });
      }
    });
    return zonesConcernees;
  }

  async function confirmer() {
    setErreur('');
    setEnCours(true);
    try {
      await confirmerRemplissage();
      momentConfirmationRef.current = new Date();
      setEtape('attente');
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  if (etape === 'avant') {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.centre}>
          <Ionicons name="camera-outline" size={56} color={colors.amberDeep} style={{ marginBottom: spacing.lg }} />
          <Text style={styles.titre}>Confirmer le remplissage</Text>
          <Text style={styles.sousTitre}>
            Remplissez votre pilulier pour la semaine, puis appuyez sur le bouton ci-dessous. Une
            photo de référence sera prise à la prochaine fermeture du couvercle.
          </Text>
          {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
          <PrimaryButton label="J'ai rempli mon pilulier" onPress={confirmer} loading={enCours} />
        </View>
      </ScreenContainer>
    );
  }

  if (etape === 'attente') {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.ink} style={{ marginBottom: spacing.lg }} />
          <Text style={styles.titre}>Fermez le couvercle</Text>
          <Text style={styles.sousTitre}>
            En attente de la photo de référence. Fermez le couvercle de votre pilulier pour continuer.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (etape === 'expire') {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.centre}>
          <Ionicons name="time-outline" size={56} color={colors.clay} style={{ marginBottom: spacing.lg }} />
          <Text style={styles.titre}>Toujours pas de photo</Text>
          <Text style={styles.sousTitre}>
            Nous n’avons pas reçu de photo de votre pilulier. Vérifiez qu’il est bien connecté et
            que le couvercle a été fermé, puis réessayez.
          </Text>
          <PrimaryButton label="Réessayer" onPress={() => setEtape('avant')} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.centreResultat}>
        <Ionicons
          name={zonesVides.length === 0 ? 'checkmark-circle' : 'alert-circle'}
          size={56}
          color={zonesVides.length === 0 ? colors.sage : colors.amberDeep}
        />
        <Text style={styles.titre}>
          {zonesVides.length === 0 ? 'Tout est en ordre' : 'Cases encore vides'}
        </Text>
        <Text style={styles.sousTitre}>
          {zonesVides.length === 0
            ? 'Toutes les cases attendues contiennent bien un médicament.'
            : "Ces cases devraient contenir un médicament, mais la photo les montre vides. Vérifiez-les tout de suite plutôt que de le découvrir plus tard."}
        </Text>
      </View>

      <FlatList
        scrollEnabled={false}
        data={zonesVides}
        keyExtractor={(item) => String(item.indice)}
        renderItem={({ item }) => (
          <View style={styles.ligneZone}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.clay} />
            <Text style={styles.ligneZoneTexte}>
              {item.noms} — {item.jourSemaine.toLowerCase()}, créneau {item.creneau}
            </Text>
          </View>
        )}
      />

      <PrimaryButton label="Terminé" onPress={() => navigation.goBack()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  centreResultat: { alignItems: 'center', padding: spacing.lg },
  titre: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h1,
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  ligneZone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.clayBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  ligneZoneTexte: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.small, color: colors.ink, marginLeft: spacing.xs, flex: 1 },
});
