import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import PrimaryButton from '../components/PrimaryButton';
import { obtenirMonDispositif, associerDispositif } from '../api/dispositifApi';
import { messageErreur } from '../api/client';
import { colors, spacing, radius } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const LIBELLES_ETAT = {
  CONNECTE: { texte: 'Connecté', couleurFond: colors.sageBg, couleurTexte: colors.sage },
  HORS_LIGNE: { texte: 'Hors ligne', couleurFond: colors.clayBg, couleurTexte: colors.clay },
};

/** F3 — voir l'état d'association du pilulier, et l'associer (PC-37/38/39). */
export default function DispositifScreen() {
  const [dispositif, setDispositif] = useState(null);
  const [identifiant, setIdentifiant] = useState('');
  const [chargement, setChargement] = useState(true);
  const [association, setAssociation] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const d = await obtenirMonDispositif();
      setDispositif(d);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function associer() {
    setErreur('');
    setMessage('');
    if (!identifiant.trim()) {
      setErreur("Entrez l'identifiant affiché sur votre pilulier.");
      return;
    }

    setAssociation(true);
    try {
      const resultat = await associerDispositif(identifiant.trim());
      setDispositif(resultat);
      setMessage('Pilulier associé. Votre traitement des 7 prochains jours est prêt.');
    } catch (err) {
      // RG-09 : le message du serveur explique déjà pourquoi (déjà associé
      // à ce compte, ou déjà pris par un autre compte).
      setErreur(messageErreur(err));
    } finally {
      setAssociation(false);
    }
  }

  if (chargement) return null;

  const etat = dispositif?.etatConnexion === 'CONNECTE' ? LIBELLES_ETAT.CONNECTE : LIBELLES_ETAT.HORS_LIGNE;
  const dejaAssocie = !!dispositif?.identifiantDispositif;

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>Pilulier</Text>
      <Text style={styles.titre}>Mon dispositif</Text>

      <View style={styles.carteEtat}>
        <View style={[styles.pastille, { backgroundColor: etat.couleurFond }]}>
          <Text style={[styles.pastilleTexte, { color: etat.couleurTexte }]}>{etat.texte}</Text>
        </View>
        {dejaAssocie ? (
          <>
            <Text style={styles.ligneEtat}>Identifiant : {dispositif.identifiantDispositif}</Text>
            {dispositif.dernierContact ? (
              <Text style={styles.ligneEtatSecondaire}>
                Dernier contact : {new Date(dispositif.dernierContact).toLocaleString('fr-CA')}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.ligneEtatSecondaire}>Aucun pilulier associé pour le moment.</Text>
        )}
      </View>

      {!dejaAssocie && (
        <View style={styles.formulaire}>
          <Text style={styles.sousTitre}>
            Entrez l'identifiant affiché sur l'écran de votre pilulier (ou de son circuit simulé).
          </Text>
          <TextField
            label="Identifiant du dispositif"
            value={identifiant}
            onChangeText={setIdentifiant}
            placeholder="ex. ESP32-A1B2C3"
            autoCapitalize="characters"
          />
          {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
          {message ? <Text style={styles.succes}>{message}</Text> : null}
          <PrimaryButton label="Associer mon pilulier" onPress={associer} loading={association} />
        </View>
      )}
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
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  pastille: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  pastilleTexte: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, textTransform: 'uppercase', letterSpacing: 0.6 },
  ligneEtat: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.body, color: colors.ink },
  ligneEtatSecondaire: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.inkSoft, marginTop: 4 },
  formulaire: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  sousTitre: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.inkSoft, marginBottom: spacing.md },
  erreur: { fontFamily: fonts.bodyMedium, color: colors.clay, fontSize: fontSizes.small, marginBottom: spacing.sm },
  succes: { fontFamily: fonts.bodyMedium, color: colors.sage, fontSize: fontSizes.small, marginBottom: spacing.sm },
});
