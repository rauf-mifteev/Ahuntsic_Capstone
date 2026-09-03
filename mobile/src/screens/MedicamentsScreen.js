import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import TextField from '../components/TextField';
import PrimaryButton from '../components/PrimaryButton';
import Chip from '../components/Chip';
import { listerMedicaments, creerMedicament } from '../api/medicamentApi';
import { messageErreur } from '../api/client';
import { colors, spacing, radius } from '../theme/colors';
import { fonts, fontSizes } from '../theme/typography';

const JOURS = [
  { valeur: 'LUNDI', libelle: 'Lun' },
  { valeur: 'MARDI', libelle: 'Mar' },
  { valeur: 'MERCREDI', libelle: 'Mer' },
  { valeur: 'JEUDI', libelle: 'Jeu' },
  { valeur: 'VENDREDI', libelle: 'Ven' },
  { valeur: 'SAMEDI', libelle: 'Sam' },
  { valeur: 'DIMANCHE', libelle: 'Dim' },
];

const CRENEAUX = [
  { valeur: 1, libelle: 'Matin' },
  { valeur: 2, libelle: 'Midi' },
  { valeur: 3, libelle: 'Soir' },
  { valeur: 4, libelle: 'Coucher' },
];

/** F2 — enregistrer les médicaments et les assigner à un créneau déjà configuré. */
export default function MedicamentsScreen() {
  const [medicaments, setMedicaments] = useState([]);
  const [nom, setNom] = useState('');
  const [dosage, setDosage] = useState('');
  const [notesApparence, setNotesApparence] = useState('');
  const [creneau, setCreneau] = useState(1);
  const [joursSemaine, setJoursSemaine] = useState([]);
  const [erreurGenerale, setErreurGenerale] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);

  const charger = useCallback(async () => {
    try {
      const liste = await listerMedicaments();
      setMedicaments(liste);
    } catch (err) {
      setErreurGenerale(messageErreur(err));
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  function basculerJour(jour) {
    setJoursSemaine((precedent) =>
      precedent.includes(jour) ? precedent.filter((j) => j !== jour) : [...precedent, jour]
    );
  }

  async function ajouter() {
    setErreurGenerale('');
    if (!nom.trim() || !dosage.trim() || joursSemaine.length === 0) {
      setErreurGenerale('Le nom, le dosage et au moins un jour sont requis.');
      return;
    }

    setEnregistrement(true);
    try {
      await creerMedicament({ nom: nom.trim(), dosage: dosage.trim(), notesApparence, creneau, joursSemaine });
      setNom('');
      setDosage('');
      setNotesApparence('');
      setJoursSemaine([]);
      await charger();
    } catch (err) {
      // Si le créneau choisi n'a pas encore d'heure, l'API répond 400 avec
      // un message clair ("Choisissez d'abord une heure pour ce créneau...").
      setErreurGenerale(messageErreur(err));
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>Traitement</Text>
      <Text style={styles.titre}>Mes médicaments</Text>

      <View style={styles.formulaire}>
        <TextField label="Nom du médicament" value={nom} onChangeText={setNom} placeholder="Ex. Metformine" />
        <TextField label="Dosage" value={dosage} onChangeText={setDosage} placeholder="Ex. 500 mg" />
        <TextField
          label="Apparence (optionnel)"
          value={notesApparence}
          onChangeText={setNotesApparence}
          placeholder="Ex. comprimé blanc ovale"
        />

        <Text style={styles.etiquette}>Créneau</Text>
        <View style={styles.rangeeChips}>
          {CRENEAUX.map((c) => (
            <Chip key={c.valeur} label={c.libelle} selected={creneau === c.valeur} onPress={() => setCreneau(c.valeur)} />
          ))}
        </View>

        <Text style={styles.etiquette}>Jours</Text>
        <View style={styles.rangeeChips}>
          {JOURS.map((j) => (
            <Chip
              key={j.valeur}
              label={j.libelle}
              selected={joursSemaine.includes(j.valeur)}
              onPress={() => basculerJour(j.valeur)}
            />
          ))}
        </View>

        {erreurGenerale ? <Text style={styles.erreurGenerale}>{erreurGenerale}</Text> : null}

        <PrimaryButton label="Ajouter le médicament" onPress={ajouter} loading={enregistrement} />
      </View>

      <Text style={styles.sousTitreListe}>Déjà enregistrés</Text>
      <FlatList
        scrollEnabled={false}
        data={medicaments}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.videTexte}>Aucun médicament pour le moment.</Text>}
        renderItem={({ item }) => (
          <View style={styles.carteMedicament}>
            <Text style={styles.nomMedicament}>{item.nom}</Text>
            <Text style={styles.detailMedicament}>
              {item.dosage} · Créneau {item.creneau} · {item.joursSemaine.length} jour(s)/semaine
            </Text>
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
  formulaire: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  etiquette: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.small,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  rangeeChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  erreurGenerale: { fontFamily: fonts.bodyMedium, color: colors.clay, fontSize: fontSizes.small, marginBottom: spacing.sm },
  sousTitreListe: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.body, color: colors.ink, marginBottom: spacing.sm },
  videTexte: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: fontSizes.small },
  carteMedicament: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  nomMedicament: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.body, color: colors.ink },
  detailMedicament: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.inkSoft, marginTop: 2 },
});
