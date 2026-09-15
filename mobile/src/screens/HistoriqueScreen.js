import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import { obtenirHistorique, listerPrisesDuJour } from '../api/priseApi';
import { obtenirMonDispositif } from '../api/dispositifApi';
import { colors, spacing, radius } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const PERIODES = [7, 14, 30];

const NOMS_CRENEAUX = { 1: 'Matin', 2: 'Midi', 3: 'Soir', 4: 'Coucher' };

const LIBELLE_STATUT = {
  CONFIRMEE: { texte: 'Confirmée', couleur: colors.sage, fond: colors.sageBg, icone: 'checkmark-circle-outline' },
  MANQUEE: { texte: 'Manquée', couleur: colors.clay, fond: colors.clayBg, icone: 'close-circle-outline' },
  AMBIGUE: { texte: 'À confirmer', couleur: colors.amberDeep, fond: colors.amberGlow, icone: 'help-circle-outline' },
  EN_VERIFICATION: { texte: 'En cours', couleur: colors.amberDeep, fond: colors.amberGlow, icone: 'eye-outline' },
  PREVUE: { texte: 'À venir', couleur: colors.inkSoft, fond: colors.creamDim, icone: 'time-outline' },
};

function formaterTaux(taux) {
  // null = aucune prise réglée sur la période. Afficher 0 % serait faux.
  if (taux === null || taux === undefined) return '—';
  return `${Math.round(taux * 100)} %`;
}

function formaterDate(dateCalendaire) {
  const [annee, mois, jour] = dateCalendaire.split('-').map(Number);
  // Date construite en UTC puis formatée en UTC : le jour affiché est
  // exactement celui que l'API a calculé dans le fuseau du patient.
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  return new Intl.DateTimeFormat('fr-CA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function Barre({ jour }) {
  const total = jour.confirmees + jour.manquees + jour.enAttente;
  if (total === 0) {
    return <View style={[styles.barre, styles.barreVide]} />;
  }
  return (
    <View style={styles.barre}>
      {jour.confirmees > 0 && (
        <View style={{ flex: jour.confirmees, backgroundColor: colors.sage }} />
      )}
      {jour.manquees > 0 && <View style={{ flex: jour.manquees, backgroundColor: colors.clay }} />}
      {jour.enAttente > 0 && <View style={{ flex: jour.enAttente, backgroundColor: colors.line }} />}
    </View>
  );
}

export default function HistoriqueScreen() {
  const [periode, setPeriode] = useState(PERIODES[0]);
  const [historique, setHistorique] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const [jourOuvert, setJourOuvert] = useState(null);
  const [prisesDuJour, setPrisesDuJour] = useState([]);
  const [creneauxParCompartiment, setCreneauxParCompartiment] = useState({});

  const charger = useCallback(async (nombreJours) => {
    try {
      setErreur(null);
      const resultat = await obtenirHistorique(nombreJours);
      setHistorique(resultat);
    } catch (err) {
      // Le message vient de l'API quand elle en donne un (404 sans pilulier
      // associé, par exemple) ; sinon on reste générique.
      setErreur(err?.response?.data?.erreur || "L'historique n'a pas pu être chargé.");
    }
  }, []);

  useEffect(() => {
    let actif = true;
    setChargement(true);
    charger(periode).finally(() => {
      if (actif) setChargement(false);
    });
    return () => {
      actif = false;
    };
  }, [charger, periode]);

  const rafraichir = useCallback(async () => {
    setRafraichissement(true);
    await charger(periode);
    setRafraichissement(false);
  }, [charger, periode]);

  const ouvrirJour = useCallback(
    async (date) => {
      if (jourOuvert === date) {
        setJourOuvert(null);
        return;
      }

      setJourOuvert(date);
      setPrisesDuJour([]);

      try {
        const [prises, dispositif] = await Promise.all([listerPrisesDuJour(date), obtenirMonDispositif()]);

        const parCompartiment = {};
        dispositif.compartiments.forEach((c) => {
          parCompartiment[c.indice] = c.creneau;
        });

        setCreneauxParCompartiment(parCompartiment);
        setPrisesDuJour(prises);
      } catch (err) {
        // Le détail d'un jour est un bonus : s'il ne charge pas, le reste de
        // l'écran doit rester utilisable.
        setPrisesDuJour([]);
      }
    },
    [jourOuvert]
  );

  if (chargement) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </ScreenContainer>
    );
  }

  const resume = historique?.resume;

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={rafraichissement} onRefresh={rafraichir} tintColor={colors.inkSoft} />}
    >
      <Text style={styles.eyebrow}>Historique</Text>
      <Text style={styles.titre}>Mon adhérence</Text>

      <View style={styles.periodes}>
        {PERIODES.map((jours) => (
          <Pressable
            key={jours}
            onPress={() => setPeriode(jours)}
            style={[styles.periode, periode === jours && styles.periodeActive]}
          >
            <Text style={[styles.periodeTexte, periode === jours && styles.periodeTexteActif]}>{jours} jours</Text>
          </Pressable>
        ))}
      </View>

      {erreur && <Text style={styles.erreur}>{erreur}</Text>}

      {resume && (
        <View style={styles.carte}>
          <Text style={styles.taux}>{formaterTaux(resume.tauxAdherence)}</Text>
          <Text style={styles.tauxLegende}>
            {resume.confirmees} confirmée{resume.confirmees > 1 ? 's' : ''} sur{' '}
            {resume.confirmees + resume.manquees} prise{resume.confirmees + resume.manquees > 1 ? 's' : ''} réglée
            {resume.confirmees + resume.manquees > 1 ? 's' : ''}
          </Text>

          <View style={styles.compteurs}>
            <View style={styles.compteur}>
              <Text style={[styles.compteurNombre, { color: colors.sage }]}>{resume.confirmees}</Text>
              <Text style={styles.compteurTexte}>confirmées</Text>
            </View>
            <View style={styles.compteur}>
              <Text style={[styles.compteurNombre, { color: colors.clay }]}>{resume.manquees}</Text>
              <Text style={styles.compteurTexte}>manquées</Text>
            </View>
            <View style={styles.compteur}>
              <Text style={[styles.compteurNombre, { color: colors.inkSoft }]}>{resume.enAttente}</Text>
              <Text style={styles.compteurTexte}>en attente</Text>
            </View>
          </View>

          <Text style={styles.detailConfirmation}>
            {resume.confirmeesAutomatiquement} confirmée{resume.confirmeesAutomatiquement > 1 ? 's' : ''} par photo,{' '}
            {resume.confirmeesManuellement} à la main
          </Text>
        </View>
      )}

      {historique?.parJour?.map((jour) => {
        const ouvert = jourOuvert === jour.date;
        return (
          <View key={jour.date} style={styles.jour}>
            <Pressable style={styles.jourEntete} onPress={() => ouvrirJour(jour.date)}>
              <View style={styles.jourTexte}>
                <Text style={styles.jourDate}>{formaterDate(jour.date)}</Text>
                <Text style={styles.jourResume}>
                  {jour.total === 0
                    ? 'Aucune prise prévue'
                    : `${jour.confirmees} confirmée${jour.confirmees > 1 ? 's' : ''}, ${jour.manquees} manquée${
                        jour.manquees > 1 ? 's' : ''
                      }`}
                </Text>
              </View>
              <Text style={styles.jourTaux}>{formaterTaux(jour.tauxAdherence)}</Text>
              <Ionicons
                name={ouvert ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.inkSoft}
                style={styles.chevron}
              />
            </Pressable>

            <Barre jour={jour} />

            {ouvert && (
              <View style={styles.detail}>
                {prisesDuJour.length === 0 ? (
                  <Text style={styles.detailVide}>Aucune prise à afficher pour cette journée.</Text>
                ) : (
                  prisesDuJour.map((prise) => {
                    const libelle = LIBELLE_STATUT[prise.statut] || LIBELLE_STATUT.PREVUE;
                    const creneau = creneauxParCompartiment[prise.compartimentIndice];
                    return (
                      <View key={prise.id} style={styles.ligneDetail}>
                        <View style={[styles.pastille, { backgroundColor: libelle.fond }]}>
                          <Ionicons name={libelle.icone} size={16} color={libelle.couleur} />
                        </View>
                        <Text style={styles.ligneDetailTexte}>
                          {NOMS_CRENEAUX[creneau] || `Case ${prise.compartimentIndice}`}
                        </Text>
                        <Text style={[styles.ligneDetailStatut, { color: libelle.couleur }]}>{libelle.texte}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        );
      })}

      <Text style={styles.note}>
        Le taux compte les prises réglées : une prise encore à venir ne fait pas baisser le pourcentage.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.amberDeep,
    marginBottom: spacing.xs,
  },
  titre: { fontFamily: fonts.heading, fontSize: fontSizes.h1, color: colors.ink, marginBottom: spacing.md },
  periodes: { flexDirection: 'row', marginBottom: spacing.lg },
  periode: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing.xs,
    backgroundColor: colors.white,
  },
  periodeActive: { backgroundColor: colors.amberGlow, borderColor: colors.amberDeep },
  periodeTexte: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label, color: colors.inkSoft },
  periodeTexteActif: { color: colors.amberDeep },
  erreur: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.clay, marginBottom: spacing.md },
  carte: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  taux: { fontFamily: fonts.heading, fontSize: 48, color: colors.ink },
  tauxLegende: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.inkSoft,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  compteurs: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  compteur: { flex: 1, alignItems: 'center' },
  compteurNombre: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.h2 },
  compteurTexte: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.inkSoft },
  detailConfirmation: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.inkSoft,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  jour: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  jourEntete: { flexDirection: 'row', alignItems: 'center' },
  jourTexte: { flex: 1 },
  jourDate: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.small, color: colors.ink },
  jourResume: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.inkSoft },
  jourTaux: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.small, color: colors.ink },
  chevron: { marginLeft: spacing.xs },
  barre: { flexDirection: 'row', height: 6, borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.xs },
  barreVide: { backgroundColor: colors.creamDim },
  detail: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm },
  detailVide: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.inkSoft },
  ligneDetail: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  pastille: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  ligneDetailTexte: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.small, color: colors.ink },
  ligneDetailStatut: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label },
  note: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.inkSoft,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
