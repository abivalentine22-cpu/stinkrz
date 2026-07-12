// Firebase Cloud Messaging background service worker.
// Uses the compat SDK via CDN so it runs without bundling.
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAyAtv-X-h7SzOy4KWkUKNRKu7TQBfn8Qw",
  authDomain: "stinkr-push.firebaseapp.com",
  projectId: "stinkr-push",
  storageBucket: "stinkr-push.firebasestorage.app",
  messagingSenderId: "334427103792",
  appId: "1:334427103792:web:5d43d7c5db8f53beb9c3f5",
  measurementId: "G-C5BS75PQD6",
});

const STINKRZ_ICON = "https://media.base44.com/images/public/69faa8a3ff7324c96aef6556/20c9ebc1d_image34.jpg";

const messaging = firebase.messaging();

// Data-only messages arrive here and we render the notification manually.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || "Stinkrz";
  const body = data.body || "";
  self.registration.showNotification(title, {
    body,
    icon: STINKRZ_ICON,
    data,
    tag: data.tag || (data.type ? `stinkrz-${data.type}` : "stinkrz"),
    renotify: true,
    requireInteraction: false,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = data.url || "/";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          try {
            await client.focus();
            if (typeof client.navigate === "function") await client.navigate(target);
            return;
          } catch (_) {}
        }
      }
      try {
        await self.clients.openWindow(target);
      } catch (_) {}
    })()
  );
});
