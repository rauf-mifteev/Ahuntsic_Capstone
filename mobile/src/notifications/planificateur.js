import * as Notifications from 'expo-notifications';
import { navigationRef } from '../navigation/AppNavigator';

const LIBELLES_CRENEAU = { 1: 'matin', 2: 'midi', 3: 'soir', 4: 'coucher' };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function demanderPermissionNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function planifierRappelsPourAujourdhui(prises, infosParCompartiment) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const maintenant = new Date();
  const prisesAPlanifier = prises.filter((p) => p.statut === 'PREVUE' && new Date(p.heurePrevue) > maintenant);

  await Promise.all(
    prisesAPlanifier.map((prise) => {
      const infos = infosParCompartiment[prise.compartimentIndice] || {};
      const nom = infos.noms || 'votre médicament';
      const libelleCreneau = LIBELLES_CRENEAU[infos.creneau] || '';

      return Notifications.scheduleNotificationAsync({
        content: {
          title: `C'est l'heure : ${nom}`,
          body: libelleCreneau ? `Prise du ${libelleCreneau} à prendre.` : 'Une prise vous attend.',
          data: { priseId: prise.id },
        },

        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(prise.heurePrevue),
        },
      });
    })
  );
}

export function ecouterActivationNotification() {
  return Notifications.addNotificationResponseReceivedListener((reponse) => {
    const { priseId } = reponse.notification.request.content.data || {};
    if (priseId && navigationRef.isReady()) {
      navigationRef.navigate('Resultat', { priseId });
    }
  });
}

