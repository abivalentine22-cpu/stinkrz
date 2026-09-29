import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Returns true when there are profile views newer than the user's last
// "Who Viewed Me" check. Self-clears when the /viewers page marks seen.
export function useNewViewersBadge(userEmail) {
  const [hasNewViews, setHasNewViews] = useState(false);
  const lastCheckRef = useRef(null);

  useEffect(() => {
    if (!userEmail) {
      setHasNewViews(false);
      return;
    }
    let cancelled = false;

    const init = async () => {
      // Load the user's own profile to get the last-check timestamp.
      const profiles = await base44.entities.ScentProfile.filter({ user_email: userEmail });
      if (cancelled) return;
      const myProfile = profiles[0];

      let lastCheck = null;
      if (myProfile?.last_viewers_check) {
        lastCheck = new Date(myProfile.last_viewers_check);
      } else if (myProfile) {
        // First-time: stamp "now" so the entire historical view backlog is
        // NOT marked as new. Only views after this moment count as new.
        const now = new Date().toISOString();
        await base44.entities.ScentProfile.update(myProfile.id, { last_viewers_check: now });
        lastCheck = new Date(now);
      }
      lastCheckRef.current = lastCheck;

      // Evaluate current views against the cutoff.
      const views = await base44.entities.ProfileView.filter({ viewed_email: userEmail });
      if (cancelled) return;
      const hasNew = views.some((v) => !lastCheck || new Date(v.created_date) > lastCheck);
      setHasNewViews(hasNew);
    };

    init();

    // Live: a new view arrives.
    const unsubViews = base44.entities.ProfileView.subscribe((event) => {
      if (event.type === "create" && event.data?.viewed_email === userEmail) {
        const lastCheck = lastCheckRef.current;
        if (!lastCheck || new Date(event.data.created_date) > lastCheck) {
          setHasNewViews(true);
        }
      }
    });

    // Live: the /viewers page (or first-time init) updated last_viewers_check → clear.
    const unsubProfile = base44.entities.ScentProfile.subscribe((event) => {
      if (event.type === "update" && event.data?.user_email === userEmail && event.data.last_viewers_check) {
        lastCheckRef.current = new Date(event.data.last_viewers_check);
        setHasNewViews(false);
      }
    });

    return () => {
      cancelled = true;
      unsubViews?.();
      unsubProfile?.();
    };
  }, [userEmail]);

  return hasNewViews;
}

// Call when the /viewers page opens — stamps the last-check time to now so
// all currently-known views are considered seen.
export async function markViewersSeen(userEmail) {
  const profiles = await base44.entities.ScentProfile.filter({ user_email: userEmail });
  const myProfile = profiles[0];
  if (!myProfile) return;
  await base44.entities.ScentProfile.update(myProfile.id, {
    last_viewers_check: new Date().toISOString(),
  });
}