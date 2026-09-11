#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

#include "config_locale.h"

const char *SSID_WIFI = "Wokwi-GUEST";
const char *MOT_DE_PASSE_WIFI = "";

const int BROCHE_BOUTON_COUVERCLE = 4;
const int BROCHE_DEL_ETAT_RESEAU = 2;
const int BROCHES_DEL_CRENEAU[4] = {16, 17, 18, 19};

const unsigned long DELAI_ANTIREBOND_MS = 200;
const unsigned long DELAI_ENTRE_TENTATIVES_MS = 5000;
const unsigned long DELAI_SONDAGE_DEL_MS = 4000;

bool etatPrecedentCouvercle = HIGH;
unsigned long dernierChangementMs = 0;
unsigned long derniereTentativeEnvoiMs = 0;
unsigned long dernierSondageDelMs = 0;

WiFiClientSecure clientSecurise;

struct EvenementEnAttente {
  char type[12];
  char horodatage[25];
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

void synchroniserHorloge() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  Serial.print("Synchronisation de l'heure (NTP)");
  time_t maintenant = time(nullptr);
  while (maintenant < 1700000000) {
    delay(300);
    Serial.print(".");
    maintenant = time(nullptr);
  }
  Serial.println(" synchronisée.");
}

String horodatageIso8601() {
  time_t maintenant = time(nullptr);
  struct tm tmUtc;
  gmtime_r(&maintenant, &tmUtc);

  char tampon[25];
  strftime(tampon, sizeof(tampon), "%Y-%m-%dT%H:%M:%SZ", &tmUtc);
  return String(tampon);
}

bool debuterRequete(HTTPClient &http, const String &url) {
  if (url.startsWith("https://")) {
    clientSecurise.setInsecure();
    return http.begin(clientSecurise, url);
  }
  return http.begin(url);
}

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

void mettreAJourDelCreneaux() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  debuterRequete(http, String(URL_API_BASE) + "/circuit/" + IDENTIFIANT_DISPOSITIF + "/commandes-del");
  http.setTimeout(5000);

  int codeReponse = http.GET();
  if (codeReponse != 200) {
    http.end();
    return;
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
    int creneau = (indiceZone / 7) + 1;
    if (creneau >= 1 && creneau <= 4) {
      creneauActif[creneau - 1] = true;
    }
  }

  for (int i = 0; i < 4; i++) {
    digitalWrite(BROCHES_DEL_CRENEAU[i], creneauActif[i] ? HIGH : LOW);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BROCHE_BOUTON_COUVERCLE, INPUT_PULLUP);
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

    const char *type = (etatCourant == LOW) ? "OUVERTURE" : "FERMETURE";
    Serial.printf("Couvercle : %s\n", type);
    envoyerEvenement(type);
  }

  if (nombreEnAttente > 0 && (maintenant - derniereTentativeEnvoiMs) > DELAI_ENTRE_TENTATIVES_MS) {
    derniereTentativeEnvoiMs = maintenant;
    tenterViderTampon();
  }

  if ((maintenant - dernierSondageDelMs) > DELAI_SONDAGE_DEL_MS) {
    dernierSondageDelMs = maintenant;
    mettreAJourDelCreneaux();
  }

  delay(20);
}
