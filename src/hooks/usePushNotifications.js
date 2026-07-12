import { useEffect } from "react";
import { getToken } from "firebase/messaging";
import { getFCMMessaging, FCM_VAPID_KEY } from "@/lib/firebase";
import { base44 } from "@/api/base44Client";

/**
 * Best-effort: request notification permission, obtain an FCM token, and save
 * it (deduped) against the current user so the backend can push to them.
 */
export function usePushNotifications(userEmail) {
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!userEmail) return;
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
      if (Notification.permission === "denied") return;

      // Only prompt once per browser to avoid nagging.
      if (
        Notification.permission === "default" &&
        localStorage.getItem("stinkrz_push_prompted") === "true"
      ) {
        return;
      }

      try {
        const messaging = await getFCMMessaging();
        if (!messaging || cancelled) return;

        if (Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          localStorage.setItem("stinkrz_push_prompted", "true");
          if (perm !== "granted") return;
        }

        const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
        if (cancelled || !token) return;

        // Dedupe: don't create a duplicate PushToken for this user+token.
        const existing = await base44.entities.PushToken.filter(
          { user_email: userEmail, token },
          undefined,
          1,
        );
        if (!existing.length) {
          await base44.entities.PushToken.create({
            user_email: userEmail,
            token,
            device_info: navigator.userAgent.slice(0, 160),
          });
        }
      } catch (e) {
        // Push is best-effort; never break the app over it.
        // eslint-disable-next-line no-console
        console.warn("Push setup skipped:", e?.message);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);
}