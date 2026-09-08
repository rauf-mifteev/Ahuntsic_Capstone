/**
 * Firmware du circuit simulé du pilulier (PC-41, PC-43, PC-62).
 *
 * Rôle, pour ce sprint : détecter l'ouverture/la fermeture du couvercle
 * (simulée par un bouton-poussoir), envoyer un événement réel à l'API
 * (POST /api/evenements), ne rien perdre si le réseau tombe (PC-43), et
 * allumer la DEL du créneau concerné tant qu'une prise n'est pas réglée
 * (RG-12, PC-62).
 *
 * Le boîtier physique n'existe pas : voir docs/A1-perimetre.md pour la
 * justification de ce choix. Le bouton en GPIO4 tient le rôle du capteur
 * d'ouverture du couvercle ; la DEL en GPIO2 indique que le Wi-Fi simulé
 * est connecté ; les 4 DEL des GPIO16-19 représentent les 4 créneaux de
 * la journée (et non les 28 cases individuelles — voir la note sur
 * mettreAJourDelCreneaux ci-dessous pour l'explication de cette
 * simplification).
 *
 * Note de câblage (diagram.json) : les broches de l'ESP32 DevKit se
 * nomment par leur numéro GPIO nu ("4", "16"...), PAS avec un préfixe "D"
 * comme sur une carte Arduino Uno — "esp32:D4" n'existe pas et empêche
 * silencieusement toute connexion sur cette broche.
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

#include "config_locale.h"
// Définit URL_API_BASE et IDENTIFIANT_DISPOSITIF avec VOS valeurs de test.
// Si ce fichier n'existe pas encore chez vous : copier
// src/config_locale.h.example en src/config_locale.h et y mettre vos
// propres valeurs (jamais committées, voir .gitignore).

// --- Configuration -----------------------------------------------------
// Rien de secret ici : le réseau "Wokwi-GUEST" est le réseau simulé fourni
// par Wokwi (accès Internet inclus, aucun mot de passe). Pour un vrai
// ESP32, remplacer par les identifiants du réseau réel et NE JAMAIS les
// committer en clair (voir la note de sécurité dans le README du dossier).
const char *SSID_WIFI = "Wokwi-GUEST";
const char *MOT_DE_PASSE_WIFI = "";

const int BROCHE_BOUTON_COUVERCLE = 4; // simule le capteur d'ouverture du couvercle
const int BROCHE_DEL_ETAT_RESEAU = 2;  // allumée quand le Wi-Fi est connecté
const int BROCHES_DEL_CRENEAU[4] = {16, 17, 18, 19}; // matin, midi, soir, coucher

const unsigned long DELAI_ANTIREBOND_MS = 200;
const unsigned long DELAI_ENTRE_TENTATIVES_MS = 5000; // pour ne pas marteler l'API pendant une coupure
const unsigned long DELAI_SONDAGE_DEL_MS = 4000;       // fréquence d'interrogation des DEL à allumer (PC-62)

bool etatPrecedentCouvercle = HIGH; // HIGH = fermé (résistance de tirage interne)
unsigned long dernierChangementMs = 0;
unsigned long derniereTentativeEnvoiMs = 0;
unsigned long dernierSondageDelMs = 0;

// Réutilisé pour toutes les requêtes HTTPS (voir debuterRequete ci-dessous).
WiFiClientSecure clientSecurise;

// --- Mémoire tampon hors-ligne (PC-43) -----------------------------------
// Tant qu'un événement n'a pas été confirmé reçu par l'API (code 2xx), il
// reste ici. Politique en cas de tampon plein : on retire le PLUS ANCIEN
// événement pour faire de la place au plus récent — perdre un événement
// très ancien est jugé moins grave que perdre l'événement qui vient de se
// produire, et ça borne la mémoire utilisée par le circuit.
struct EvenementEnAttente {
  char type[12];
  char horodatage[25]; // capturé au moment réel de l'événement, pas au moment de l'envoi
};

const int TAILLE_TAMPON = 20;
EvenementEnAttente tampon[TAILLE_TAMPON];
int nombreEnAttente = 0;

void mettreEnTampon(const char *type, const String &horodatage) {
  if (nombreEnAttente >= TAILLE_TAMPON) {
    for (int i = 1; i < TAILLE_TAMPON; i++) {
      tampon[i - 1] = tampon[i];
    }
    nombreEnAttente--;
    Serial.println("Tampon plein : événement le plus ancien abandonné.");
  }

  strncpy(tampon[nombreEnAttente].type, type, sizeof(tampon[nombreEnAttente].type) - 1);
  tampon[nombreEnAttente].type[sizeof(tampon[nombreEnAttente].type) - 1] = '\0';
  strncpy(tampon[nombreEnAttente].horodatage, horodatage.c_str(), sizeof(tampon[nombreEnAttente].horodatage) - 1);
  tampon[nombreEnAttente].horodatage[sizeof(tampon[nombreEnAttente].horodatage) - 1] = '\0';
  nombreEnAttente++;

  Serial.printf("Événement mis en mémoire tampon (%d en attente).\n", nombreEnAttente);
}

// --- Réseau --------------------------------------------------------------

void connecterWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID_WIFI, MOT_DE_PASSE_WIFI);

  Serial.print("Connexion au Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println(" connecté.");
  Serial.print("Adresse IP : ");
  Serial.println(WiFi.localIP());

  digitalWrite(BROCHE_DEL_ETAT_RESEAU, HIGH);
}

/** Horodatage réel via NTP (nécessaire : l'ESP32 n'a pas d'horloge interne fiable). */
void synchroniserHorloge() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  Serial.print("Synchronisation de l'heure (NTP)");
  time_t maintenant = time(nullptr);
  while (maintenant < 1700000000) { // avant cette valeur : l'heure n'est pas encore synchronisée
    delay(300);
    Serial.print(".");
    maintenant = time(nullptr);
  }
  Serial.println(" synchronisée.");
}

/** Horodatage courant au format ISO 8601 (UTC), attendu par l'API. */
String horodatageIso8601() {
  time_t maintenant = time(nullptr);
  struct tm tmUtc;
  gmtime_r(&maintenant, &tmUtc);

  char tampon[25];
  strftime(tampon, sizeof(tampon), "%Y-%m-%dT%H:%M:%SZ", &tmUtc);
  return String(tampon);
}

/**
 * Démarre une requête HTTP ou HTTPS selon le préfixe de l'URL, pour que le
 * reste du code n'ait jamais à s'en soucier. Sur HTTPS, `setInsecure()`
 * ignore la validation du certificat du serveur — acceptable pour ce
 * projet étudiant (évite d'avoir à embarquer un certificat racine), mais
 * PAS pour un vrai déploiement en production, où on vérifierait le
 * certificat normalement.
 */
bool debuterRequete(HTTPClient &http, const String &url) {
  if (url.startsWith("https://")) {
    clientSecurise.setInsecure();
    return http.begin(clientSecurise, url);
  }
  return http.begin(url);
}

/**
 * Envoie un événement à l'API. Renvoie `true` si l'API a répondu avec un
 * code de succès (2xx). En cas d'échec (pas de Wi-Fi, ou l'API ne répond
 * pas), l'événement est conservé dans le tampon plutôt que perdu (PC-43) :
 * `tenterViderTampon()` le renverra dès que la connexion sera rétablie.
 */
bool envoyerEvenement(const char *type) {
  String horodatage = horodatageIso8601();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Pas de Wi-Fi : événement mis en mémoire tampon.");
    mettreEnTampon(type, horodatage);
    return false;
  }

  HTTPClient http;
  debuterRequete(http, String(URL_API_BASE) + "/evenements");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  String corps = String("{\"identifiantDispositif\":\"") + IDENTIFIANT_DISPOSITIF +
                 "\",\"type\":\"" + type + "\",\"horodatage\":\"" + horodatage + "\"}";

  int codeReponse = http.POST(corps);
  Serial.printf("POST /evenements (%s) -> code %d\n", type, codeReponse);
  http.end();

  bool succes = codeReponse >= 200 && codeReponse < 300;
  if (!succes) {
    mettreEnTampon(type, horodatage);
  }
  return succes;
}

/**
 * Renvoie en une seule requête tous les événements accumulés hors-ligne,
 * sous forme de tableau — l'API accepte ce format nativement
 * (voir api/src/controllers/evenementController.js, prévu pour ça depuis
 * PC-42). Ne vide le tampon QUE si l'API confirme (201) : sinon, on
 * réessaiera à la prochaine tentative plutôt que de risquer de perdre des
 * événements sur un succès partiel.
 */
void tenterViderTampon() {
  if (nombreEnAttente == 0 || WiFi.status() != WL_CONNECTED) return;

  String corps = "[";
  for (int i = 0; i < nombreEnAttente; i++) {
    if (i > 0) corps += ",";
    corps += String("{\"identifiantDispositif\":\"") + IDENTIFIANT_DISPOSITIF + "\",\"type\":\"" +
             tampon[i].type + "\",\"horodatage\":\"" + tampon[i].horodatage + "\"}";
  }
  corps += "]";

  HTTPClient http;
  debuterRequete(http, String(URL_API_BASE) + "/evenements");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  int codeReponse = http.POST(corps);
  http.end();

  if (codeReponse >= 200 && codeReponse < 300) {
    Serial.printf("Tampon vidé avec succès (%d événement(s) renvoyés).\n", nombreEnAttente);
    nombreEnAttente = 0;
  } else {
    Serial.printf("Échec de l'envoi du tampon (code %d) : nouvelle tentative dans %lu ms.\n", codeReponse,
                   DELAI_ENTRE_TENTATIVES_MS);
  }
}

// --- Guidage lumineux (PC-62) --------------------------------------------

/**
 * Interroge GET /circuit/{identifiant}/commandes-del (voir
 * api/src/services/delService.js) et allume la DEL de chaque créneau
 * concerné par au moins une prise non résolue. L'API renvoie des indices
 * de zone (0-27, un par case précise), mais ce circuit de démonstration
 * n'a que 4 DEL physiques — une par CRÉNEAU plutôt qu'une par case.
 * C'est un choix volontaire : un indice de zone donné n'est jamais "dû"
 * plus d'une fois par semaine (voir la note dans Dispositif.js), donc à
 * un instant donné, tous les indices actifs pour CE dispositif partagent
 * forcément le jour courant — regrouper par créneau (indice / 7) suffit
 * pour un boîtier réel qui n'a besoin d'éclairer que "aujourd'hui".
 */
void mettreAJourDelCreneaux() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  debuterRequete(http, String(URL_API_BASE) + "/circuit/" + IDENTIFIANT_DISPOSITIF + "/commandes-del");
  http.setTimeout(5000);

  int codeReponse = http.GET();
  if (codeReponse != 200) {
    http.end();
    return; // on laisse les DEL dans leur état précédent plutôt que de tout éteindre sur un simple aléa réseau
  }

  String corps = http.getString();
  http.end();

  JsonDocument document;
  DeserializationError erreur = deserializeJson(document, corps);
  if (erreur) {
    Serial.println("Réponse de /commandes-del illisible.");
    return;
  }

  bool creneauActif[4] = {false, false, false, false};
  for (JsonVariant valeur : document["indexDEL"].as<JsonArray>()) {
    int indiceZone = valeur.as<int>();
    int creneau = (indiceZone / 7) + 1; // même formule que Dispositif.js (Node) et zones.py (Python)
    if (creneau >= 1 && creneau <= 4) {
      creneauActif[creneau - 1] = true;
    }
  }

  for (int i = 0; i < 4; i++) {
    digitalWrite(BROCHES_DEL_CRENEAU[i], creneauActif[i] ? HIGH : LOW);
  }
}

// --- Programme principal -------------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BROCHE_BOUTON_COUVERCLE, INPUT_PULLUP); // HIGH au repos, LOW quand pressé (couvercle "ouvert")
  pinMode(BROCHE_DEL_ETAT_RESEAU, OUTPUT);
  digitalWrite(BROCHE_DEL_ETAT_RESEAU, LOW);

  for (int i = 0; i < 4; i++) {
    pinMode(BROCHES_DEL_CRENEAU[i], OUTPUT);
    digitalWrite(BROCHES_DEL_CRENEAU[i], LOW);
  }

  connecterWifi();
  synchroniserHorloge();

  etatPrecedentCouvercle = digitalRead(BROCHE_BOUTON_COUVERCLE);
}

void loop() {
  bool etatCourant = digitalRead(BROCHE_BOUTON_COUVERCLE);
  unsigned long maintenant = millis();

  if (etatCourant != etatPrecedentCouvercle && (maintenant - dernierChangementMs) > DELAI_ANTIREBOND_MS) {
    dernierChangementMs = maintenant;
    etatPrecedentCouvercle = etatCourant;

    // Résistance de tirage interne (INPUT_PULLUP) : LOW = bouton pressé = couvercle "ouvert".
    const char *type = (etatCourant == LOW) ? "OUVERTURE" : "FERMETURE";
    Serial.printf("Couvercle : %s\n", type);
    envoyerEvenement(type);
  }

  // PC-43 : à intervalle régulier, retenter d'envoyer les événements
  // accumulés hors-ligne — sans bloquer la détection du bouton entre-temps.
  if (nombreEnAttente > 0 && (maintenant - derniereTentativeEnvoiMs) > DELAI_ENTRE_TENTATIVES_MS) {
    derniereTentativeEnvoiMs = maintenant;
    tenterViderTampon();
  }

  // PC-62 : à intervalle régulier, demander à l'API quelles DEL de créneau
  // allumer. S'éteint automatiquement une fois la prise réglée (RG-12),
  // sans code de "extinction" séparé — voir la note dans delService.js.
  if ((maintenant - dernierSondageDelMs) > DELAI_SONDAGE_DEL_MS) {
    dernierSondageDelMs = maintenant;
    mettreAJourDelCreneaux();
  }

  delay(20);
}
