import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import { obtenirEvenementsRecents, basculerConnexion } from '../api/demoApi';
import { messageErreur } from '../api/client';
import { colors, spacing, radius } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const DELAI_SONDAGE_MS = 3000;

const LIBELLE_TYPE = { OUVERTURE: 'Ouverture du couvercle', FERMETURE: 'Fermeture du couvercle' };

export default function DemoScreen() {
  const [dispositif, setDispositif] = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const premierChargement = useRef(true);

  const rafraichir = useCallback(async () => {
    try {
      const resultat = await obtenirEvenementsRecents();
      setDispositif(resultat.dispositif);
      setEvenements(resultat.evenements);
      setErreur('');
    } catch (err) {
      if (premierChargement.current) setErreur(messageErreur(err));
    } finally {
      premierChargement.current = false;
    }
  }, []);

  useEffect(() => {
    rafraichir();
    const intervalle = setInterval(rafraichir, DELAI_SONDAGE_MS);
    return () => clearInterval(intervalle);
  }, [rafraichir]);

  async function basculer() {
    setEnCours(true);
    try {
      const estConnecte = dispositif?.etatConnexion === 'CONNECTE' && !dispositif?.modeDemoDeconnecte;
      const dispositifMisAJour = await basculerConnexion(estConnecte);
      setDispositif(dispositifMisAJour);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  const estDeconnecteEnDemo = dispositif?.modeDemoDeconnecte === true;

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>Démonstration en direct</Text>
      <Text style={styles.titre}>État du circuit</Text>

      <View style={[styles.carteEtat, estDeconnecteEnDemo && styles.carteEtatCoupee]}>
        <Ionicons
          name={estDeconnecteEnDemo ? 'cloud-offline' : 'cloud-done'}
          size={28}
          color={estDeconnecteEnDemo ? colors.clay : colors.sage}
        />
        <View style={{ marginLeft: spacing.sm, flex: 1 }}>
          <Text style={styles.etatTitre}>{estDeconnecteEnDemo ? 'Pilulier déconnecté' : 'Pilulier connecté'}</Text>
          <Text style={styles.etatTexte}>
            {estDeconnecteEnDemo
              ? "Le pilulier ne peut plus envoyer d'informations en ce moment. Rien n'est perdu : tout ce qu'il enregistre sera transmis dès que la connexion reviendra."
              : "Le pilulier envoie ses informations normalement."}
          </Text>
        </View>
      </View>

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      <PrimaryButton
        label={estDeconnecteEnDemo ? 'Rétablir la connexion' : 'Couper la connexion'}
        variant={estDeconnecteEnDemo ? 'primary' : 'secondary'}
        onPress={basculer}
        loading={enCours}
      />

      <Text style={styles.sectionTitre}>Événements récents</Text>
      <FlatList
        scrollEnabled={false}
        data={evenements}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.videTexte}>Aucun événement pour le moment.</Text>}
        renderItem={({ item }) => (
          <View style={styles.ligneEvenement}>
            <Ionicons
              name={item.type === 'OUVERTURE' ? 'lock-open-outline' : 'lock-closed-outline'}
              size={20}
              color={colors.inkSoft}
            />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={styles.ligneTitre}>{LIBELLE_TYPE[item.type] || item.type}</Text>
              <Text style={styles.ligneHeure}>{new Date(item.horodatage).toLocaleTimeString('fr-CA')}</Text>
              {item.verification && (
                <Text style={styles.ligneAnalyse}>
                  {item.verification.analyseEchouee
                    ? "Service d'analyse injoignable — enregistré sans vérification"
                    : `Analysé par « ${item.verification.strategieUtilisee} »${item.verification.estReference ? ' (photo de référence)' : ''}`}
                </Text>
              )}
            </View>
          </View>
        )}
      />
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
  titre: { fontFamily: fonts.heading, fontSize: fontSizes.h1, color: colors.ink, marginBottom: spacing.lg },
  carteEtat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sageBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  carteEtatCoupee: { backgroundColor: colors.clayBg },
  etatTitre: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.body, color: colors.ink },
  etatTexte: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.inkSoft, marginTop: 2 },
  erreur: { fontFamily: fonts.bodyMedium, color: colors.clay, fontSize: fontSizes.small, marginBottom: spacing.sm },
  sectionTitre: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.body,
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  videTexte: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: fontSizes.small },
  ligneEvenement: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  ligneTitre: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.small, color: colors.ink },
  ligneHeure: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.inkSoft, marginTop: 1 },
  ligneAnalyse: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label, color: colors.amberDeep, marginTop: 2 },
});
