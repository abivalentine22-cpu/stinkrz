import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Compatible scent preference pairings
const COMPATIBLE = {
  Fresh: ["Fresh", "Neutral"],
  Musky: ["Musky", "Earthy", "Ripe"],
  Ripe: ["Musky", "Ripe"],
  Earthy: ["Musky", "Earthy", "Neutral"],
  Neutral: ["Fresh", "Earthy", "Neutral"],
};

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isCompatible(myProfile, otherProfile) {
  const myPrefs = myProfile.scent_preferences?.length
    ? myProfile.scent_preferences
    : COMPATIBLE[myProfile.scent_category] || [];
  return myPrefs.includes(otherProfile.scent_category);
}

async function requestPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch {
    return null;
  }
}

function showLocalNotification(title, body, url = "/scent-block") {
  // Use SW notification if available for better UX, else fall back to Notification API
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      title,
      body,
      url,
    });
  } else if (Notification.permission === "granted") {
    const n = new Notification(title, { body, icon: "/favicon.ico" });
    n.onclick = () => {
      window.focus();
      window.location.href = url;
      n.close();
    };
  }
}

export function useScentMatchNotifications(userPos, myProfile) {
  const notifiedIds = useRef(new Set());
  const intervalRef = useRef(null);
  const permittedRef = useRef(false);

  const checkMatches = useCallback(async () => {
    if (!userPos || !myProfile || !permittedRef.current) return;
    try {
      const all = await base44.entities.ScentProfile.list();
      const matches = all.filter((p) => {
        if (p.user_email === myProfile.user_email) return false;
        if (!p.location_lat || !p.location_lng) return false;
        if (!p.is_online) return false;
        const dist = haversineDistance(
          userPos.lat,
          userPos.lng,
          p.location_lat,
          p.location_lng
        );
        if (dist > 1) return false;
        return isCompatible(myProfile, p);
      });

      matches.forEach((match) => {
        if (notifiedIds.current.has(match.id)) return;
        notifiedIds.current.add(match.id);
        const dist = haversineDistance(
          userPos.lat,
          userPos.lng,
          match.location_lat,
          match.location_lng
        ).toFixed(1);
        showLocalNotification(
          "👃 Scent Match Nearby!",
          `${match.display_name} (${match.scent_category}) is ${dist} mi away — your vibe could click!`,
          "/scent-block"
        );
      });

      // Clear notified cache every 30 minutes so users can be re-notified
      // (handled by interval restart, not needed here)
    } catch {
      // silently ignore network errors
    }
  }, [userPos, myProfile]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const granted = await requestPermission();
      if (!granted || cancelled) return;
      permittedRef.current = true;
      await registerSW();
      // Check immediately, then every 2 minutes
      checkMatches();
      intervalRef.current = setInterval(() => {
        checkMatches();
      }, 2 * 60 * 1000);
    }

    init();
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // only run once on mount

  // Re-check when position or profile changes
  useEffect(() => {
    if (permittedRef.current) checkMatches();
  }, [checkMatches]);

  // Reset notified cache every 30 minutes to allow re-notifications
  useEffect(() => {
    const clearTimer = setInterval(() => {
      notifiedIds.current.clear();
    }, 30 * 60 * 1000);
    return () => clearInterval(clearTimer);
  }, []);
}