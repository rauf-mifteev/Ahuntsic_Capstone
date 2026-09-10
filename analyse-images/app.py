"""
Service FastAPI d'analyse d'images (PC-49, étendu en PC-51) — voir
docs/B5-architecture-logicielle.md, composant « API d'inférence »
(`ServAPI`). Reçoit une image du plateau et renvoie un résultat pour
chacune des 28 zones, avec un score (AC de PC-47).

--------------------------------------------------------------------------
Contrat HTTP
--------------------------------------------------------------------------

    POST /analyser
      (a) multipart/form-data, champ « image » = fichier JPEG/PNG
      (b) application/json, {"dispositifId": "..."}      <- ajouté en PC-51

      -> 200
      {
        "strategie": "seuillage-opencv",
        "simule": false,
        "image": null,
        "resultats": [ {"indice": 0, "occupee": false, "score": 0.93}, ... ]
      }
      (28 éléments, dans l'ordre canonique — voir zones.py)

      `image` : le PNG encodé en base64, renvoyé UNIQUEMENT quand le
      service a dessiné la photo lui-même (forme (b), simule=true).
      Quand l'appelant fournit la photo (forme (a)), il l'a déjà : la lui
      retourner doublerait la réponse pour rien. Conservée côté API dans
      Verification.image, puis purgée après 30 jours (PC-52).

      -> 400 si ni image ni dispositifId, ou fichier illisible

    POST /simulation/remplir   {"dispositifId": "..."}
    POST /simulation/prendre   {"dispositifId": "...", "indice": 12}
    GET  /simulation/etat?dispositifId=...
    GET  /sante

La forme (b) existe parce qu'aucune caméra n'existe dans ce projet : le
circuit simulé sur Wokwi ne peut pas produire d'image. Le service
photographie alors son plateau SIMULÉ (voir plateau_simule.py) et classe
l'image obtenue avec la même stratégie que pour une vraie photo. Le
contrat de sortie est identique dans les deux cas : l'API Node.js ne fait
la différence que par le drapeau `simule`.

--------------------------------------------------------------------------
Deux familles de codes d'erreur, volontairement distinctes
--------------------------------------------------------------------------

* **422** — validation automatique de FastAPI/Pydantic : un champ manque,
  ou n'a pas le bon type (`indice` en texte, `dispositifId` absent...).
  Aucune ligne de code ici ne la produit, elle est déduite des modèles.
* **400** — règle métier vérifiée explicitement : un indice de zone hors
  des bornes 0-27, une image illisible, une requête sans image ni
  dispositif.

--------------------------------------------------------------------------
Documentation interactive
--------------------------------------------------------------------------

FastAPI publie automatiquement le contrat ci-dessus :

    http://localhost:5001/docs        (Swagger UI, essayable dans le navigateur)
    http://localhost:5001/openapi.json

C'est la raison principale du passage de Flask à FastAPI : le contrat
entre l'API Node.js et ce service n'a plus besoin d'être documenté à la
main, il est déduit des modèles Pydantic ci-dessous et ne peut donc pas
se désynchroniser du code.

La stratégie active (patron Stratégie, voir docs/B6-patrons-conception.md)
est choisie UNE FOIS au démarrage, via la variable d'environnement
MODELE_STRATEGIE (factice | seuillage | mobilenet — défaut : factice).
"""
import base64
import io
import os

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

import plateau_simule
from interface_classifieur import Classifieur
from zones import NB_ZONES

class RequeteDispositif(BaseModel):
    dispositifId: str = Field(..., min_length=1, examples=["ESP32-DEMO-001"])

class RequetePrise(RequeteDispositif):
    indice: int = Field(..., description=f"Indice de zone, 0 à {NB_ZONES - 1}", examples=[12])

class ResultatZoneSortie(BaseModel):
    indice: int = Field(..., description="0-27, ordre canonique de zones.py")
    occupee: bool = Field(..., description="décision au seuil neutre 0.5")
    score: float = Field(..., description="probabilité que la zone soit VIDE")

class ReponseAnalyse(BaseModel):
    strategie: str
    simule: bool = Field(..., description="true si l'image a été dessinée par le service")
    image: str | None = Field(
        None,
        description="PNG encodé en base64 — présent seulement si simule=true (PC-52)",
    )
    resultats: list[ResultatZoneSortie]

class ReponseEtats(BaseModel):
    etats: list[bool] = Field(..., description="28 états réels du plateau simulé (True = pleine)")

class ReponseSante(BaseModel):
    etat: str
    strategie: str

def construire_classifieur(nom_strategie: str) -> Classifieur:
    if nom_strategie == "factice":
        from strategies.factice import ClassifieurFactice

        return ClassifieurFactice()
    if nom_strategie == "seuillage":
        from strategies.seuillage import ClassifieurSeuillage

        return ClassifieurSeuillage()
    if nom_strategie == "mobilenet":
        from strategies.mobilenet import ClassifieurMobileNet

        return ClassifieurMobileNet()

    raise ValueError(
        f"MODELE_STRATEGIE invalide : {nom_strategie!r} (valeurs acceptées : factice, seuillage, mobilenet)"
    )

def creer_app(classifieur: Classifieur = None) -> FastAPI:
    """
    Fabrique de l'application. Accepte un classifieur déjà construit
    (utilisé par les tests, pour ne pas dépendre des variables
    d'environnement) ; sinon le construit depuis MODELE_STRATEGIE.
    """
    app = FastAPI(
        title="Service d'analyse d'images — pilulier connecté",
        description=__doc__,
        version="2.0.0",
    )
    app.state.classifieur = classifieur or construire_classifieur(
        os.environ.get("MODELE_STRATEGIE", "factice")
    )

    @app.exception_handler(HTTPException)
    async def erreur_lisible(_request: Request, exc: HTTPException):
        """Garde la forme {"erreur": "..."} documentée dans le contrat,
        plutôt que le {"detail": "..."} par défaut de FastAPI."""
        return JSONResponse(status_code=exc.status_code, content={"erreur": exc.detail})

    def _encoder_png_base64(image: Image.Image) -> str:
        tampon = io.BytesIO()
        image.convert("RGB").save(tampon, format="PNG")
        return base64.b64encode(tampon.getvalue()).decode("ascii")

    def _analyser_image(image: Image.Image, simule: bool) -> ReponseAnalyse:
        classifieur_actif = app.state.classifieur
        return ReponseAnalyse(
            strategie=classifieur_actif.nom,
            simule=simule,
            image=_encoder_png_base64(image) if simule else None,
            resultats=[
                ResultatZoneSortie(indice=r.indice, occupee=r.occupee, score=round(r.score, 4))
                for r in classifieur_actif.analyser(image)
            ],
        )

    @app.get("/sante", response_model=ReponseSante, summary="Le service répond-il ?")
    async def sante():
        return ReponseSante(etat="ok", strategie=app.state.classifieur.nom)

    @app.post(
        "/analyser",
        response_model=ReponseAnalyse,
        summary="Analyser une image du plateau, réelle ou simulée",
        openapi_extra={
            "requestBody": {
                "content": {
                    "multipart/form-data": {
                        "schema": {
                            "type": "object",
                            "properties": {"image": {"type": "string", "format": "binary"}},
                            "required": ["image"],
                        }
                    },
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {"dispositifId": {"type": "string"}},
                            "required": ["dispositifId"],
                        }
                    },
                }
            }
        },
    )
    async def analyser(request: Request):
        type_contenu = (request.headers.get("content-type") or "").lower()

        if type_contenu.startswith("multipart/form-data"):
            formulaire = await request.form()
            fichier = formulaire.get("image")
            if fichier is None or not hasattr(fichier, "read"):
                raise HTTPException(400, "Aucune image fournie (champ 'image' attendu)")
            try:
                image = Image.open(io.BytesIO(await fichier.read()))
                image.load()
            except (UnidentifiedImageError, OSError):
                raise HTTPException(400, "Fichier image illisible")
            return _analyser_image(image, simule=False)

        try:
            corps = RequeteDispositif.model_validate(await request.json())
        except Exception:
            raise HTTPException(
                400, "Fournir soit un fichier 'image' (multipart), soit un 'dispositifId' (JSON)"
            )

        return _analyser_image(plateau_simule.photographier(corps.dispositifId), simule=True)

    @app.post("/simulation/remplir", response_model=ReponseEtats, summary="Remplir les 28 cases")
    async def simulation_remplir(corps: RequeteDispositif):
        return ReponseEtats(etats=plateau_simule.remplir(corps.dispositifId))

    @app.post("/simulation/prendre", response_model=ReponseEtats, summary="Vider une case")
    async def simulation_prendre(corps: RequetePrise):
        if not 0 <= corps.indice < NB_ZONES:
            raise HTTPException(400, f"indice hors bornes (0..{NB_ZONES - 1})")
        return ReponseEtats(etats=plateau_simule.prendre(corps.dispositifId, corps.indice))

    @app.get("/simulation/etat", response_model=ReponseEtats, summary="État réel du plateau simulé")
    async def simulation_etat(dispositifId: str = Query(..., min_length=1)):
        return ReponseEtats(etats=plateau_simule.etat(dispositifId))

    return app

app = creer_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5001)))
