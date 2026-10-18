import { deleteToken, getToken } from 'firebase/messaging';
import { getFCMMessaging, FCM_VAPID_KEY } from './firebase';
import { createPushDeviceManager } from './pushDeviceManager';

export const pushDevice = createPushDeviceManager({
  supported: () => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator,
  acquire: async () => {
    const messaging = await getFCMMessaging();
    return messaging ? getToken(messaging, { vapidKey: FCM_VAPID_KEY }) : null;
  },
  revoke: async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const messaging = await getFCMMessaging();
    if (messaging) await deleteToken(messaging);
  },
});
