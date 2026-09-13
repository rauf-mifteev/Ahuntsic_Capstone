const priseService = require('../services/priseService');
const utilisateurRepository = require('../repositories/utilisateurRepository');
const { asyncHandler } = require('../middleware/errorHandler');

function dateDuJourDansLeFuseau(fuseauHoraire) {
  // 'en-CA' formatte directement au format YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuseauHoraire }).format(new Date());
}

async function obtenirFuseauHoraireUtilisateur(utilisateurId) {
  try {
    const utilisateur = await utilisateurRepository.trouverParId(utilisateurId);
    return utilisateur?.fuseauHoraire || priseService.FUSEAU_PAR_DEFAUT;
  } catch (err) {
    return priseService.FUSEAU_PAR_DEFAUT;
  }
}

const lister = asyncHandler(async (req, res) => {
  let date = req.query.date;
  if (!date) {
    const fuseauHoraire = await obtenirFuseauHoraireUtilisateur(req.utilisateurId);
    date = dateDuJourDansLeFuseau(fuseauHoraire);
  }
  const prises = await priseService.listerPourUtilisateurEtDate(req.utilisateurId, date);
  res.status(200).json({ prises });
});

const obtenirUne = asyncHandler(async (req, res) => {
  const prise = await priseService.obtenirPrisePourUtilisateur(req.utilisateurId, req.params.id);
  res.status(200).json({ prise });
});

const confirmer = asyncHandler(async (req, res) => {
  const prise = await priseService.obtenirPrisePourUtilisateur(req.utilisateurId, req.params.id);
  const priseConfirmee = await priseService.confirmerManuellement(prise);
  res.status(200).json({ prise: priseConfirmee });
});

const annulerConfirmation = asyncHandler(async (req, res) => {
  const prise = await priseService.obtenirPrisePourUtilisateur(req.utilisateurId, req.params.id);
  const priseMiseAJour = await priseService.annulerConfirmation(prise);
  res.status(200).json({ prise: priseMiseAJour });
});

module.exports = { lister, obtenirUne, confirmer, annulerConfirmation };