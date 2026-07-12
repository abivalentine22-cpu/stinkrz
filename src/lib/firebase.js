import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: "AIzaSyAyAtv-X-h7SzOy4KWkUKNRKu7TQBfn8Qw",
  authDomain: "stinkr-push.firebaseapp.com",
  projectId: "stinkr-push",
  storageBucket: "stinkr-push.firebasestorage.app",
  messagingSenderId: "334427103792",
  appId: "1:334427103792:web:5d43d7c5db8f53beb9c3f5",
  measurementId: "G-C5BS75PQD6",
};

// Web Push certificate key pair — Firebase Console > Project settings > Cloud Messaging > Web Push certificates
export const FCM_VAPID_KEY = "REPLACE_WITH_VAPID_KEY";

let app = null;
let messaging = null;

export async function getFCMMessaging() {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    if (!app) app = initializeApp(firebaseConfig);
    if (!messaging) messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}