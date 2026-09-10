
export function creneauxDe(medicament) {
  if (!medicament) return [];
  if (Array.isArray(medicament.creneaux) && medicament.creneaux.length > 0) {
    return medicament.creneaux;
  }
  return medicament.creneau ? [medicament.creneau] : [];
}
