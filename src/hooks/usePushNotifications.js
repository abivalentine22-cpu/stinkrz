import { useEffect } from "react";
import { pushDevice } from "@/lib/pushDevice";
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
        if (Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          localStorage.setItem("stinkrz_push_prompted", "true");
          if (perm !== "granted") return;
        }

        if (cancelled) return;
        await pushDevice.register(base44, userEmail, () => cancelled);
      } catch (e) {
        // Push is best-effort; never break the app over it.
         
        console.warn("Push setup skipped:", e?.message);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);
}