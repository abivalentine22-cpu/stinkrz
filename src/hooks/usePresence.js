import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { locationPatch } from "@/lib/location";

const HEARTBEAT_MS = 30 * 1000; // refresh is_online + last_active
const LOCATION_REFRESH_MS = 60 * 1000; // re-acquire GPS while visible
const MAP_PATH = "/scent-block"; // the map page owns its own live geolocation

/**
 * Keeps the signed-in user "online" and their location fresh across the whole
 * app, not just the Scent Block map.
 *
 * - Heartbeat: pings is_online + last_active every 30s while the app is open.
 * - Location: re-acquires GPS every 60s (and on tab refocus) ONLY when the
 *   browser has already granted geolocation (no surprise prompts) and only on
 *   non-map pages (the map owns its own live tracking).
 * - Privacy: writes go through locationPatch(), which honours invisible_mode
 *   (no location stored) and fuzzy_location (coarse ~1 km snap).
 */
export function usePresence({ userEmail, profile, pathname }) {
  const [userPos, setUserPos] = useState(null);
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Presence heartbeat — runs everywhere while signed in.
  useEffect(() => {
    if (!userEmail || !profile?.id) return;

    const beat = () =>
      base44.entities.ScentProfile
        .update(profile.id, {
          is_online: true,
          last_active: new Date().toISOString(),
        })
        .catch(() => {});

    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [userEmail, profile?.id]);

  // Location refresh — only on non-map pages, only if already granted.
  useEffect(() => {
    if (!userEmail || !profile?.id) return;
    if (pathname === MAP_PATH) return; // ScentBlock owns geolocation on the map
    if (typeof navigator === "undefined" || !navigator.geolocation || !navigator.permissions) return;

    let cancelled = false;
    let interval = null;

    const acquire = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          setUserPos({ lat: latitude, lng: longitude });
          base44.entities.ScentProfile
            .update(profile.id, locationPatch(latitude, longitude, profileRef.current))
            .catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: LOCATION_REFRESH_MS, timeout: 10000 }
      );
    };

    const onVis = () => {
      if (document.visibilityState === "visible") acquire();
    };

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (cancelled || status.state !== "granted") return;
        acquire();
        interval = setInterval(() => {
          if (document.visibilityState === "visible") acquire();
        }, LOCATION_REFRESH_MS);
        document.addEventListener("visibilitychange", onVis);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userEmail, profile?.id, pathname]);

  return { userPos };
}