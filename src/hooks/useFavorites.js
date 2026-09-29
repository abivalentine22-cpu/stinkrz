import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// The Favorite entity doubles as the "Whiff" — a lightweight interest signal.
// sendWhiff creates the Favorite (client-side, allowed by RLS) and triggers a
// backend function for the cross-user notification + push.
export function useFavorites(myEmail) {
  const [favorites, setFavorites] = useState([]); // emails I've whiffed
  const [favoritedBy, setFavoritedBy] = useState([]); // emails who whiffed me
  const inFlightRef = useRef(new Set());

  useEffect(() => {
    if (!myEmail) return;
    base44.entities.Favorite.filter({ from_email: myEmail }).then(f => setFavorites(f.map(x => x.to_email)));
    base44.entities.Favorite.filter({ to_email: myEmail }).then(f => setFavoritedBy(f.map(x => x.from_email)));
  }, [myEmail]);

  const isFavorited = (email) => favorites.includes(email);
  const hasFavoritedMe = (email) => favoritedBy.includes(email);

  // Send a Whiff — one-shot per person to prevent duplicate/spam.
  const sendWhiff = async (toEmail) => {
    if (!myEmail || !toEmail || toEmail === myEmail) return;
    if (isFavorited(toEmail) || inFlightRef.current.has(toEmail)) return;
    inFlightRef.current.add(toEmail);
    try {
      await base44.entities.Favorite.create({ from_email: myEmail, to_email: toEmail });
      setFavorites(prev => prev.includes(toEmail) ? prev : [...prev, toEmail]);
      base44.functions.invoke('sendWhiffNotification', { from_email: myEmail, to_email: toEmail }).catch(() => {});
    } finally {
      inFlightRef.current.delete(toEmail);
    }
  };

  // Kept for backward compatibility (e.g. Viewers "favorite back").
  // Sending delegates to sendWhiff; withdrawing removes the Favorite.
  const toggleFavorite = async (toEmail) => {
    if (isFavorited(toEmail)) {
      const all = await base44.entities.Favorite.filter({ from_email: myEmail, to_email: toEmail });
      if (all[0]) await base44.entities.Favorite.delete(all[0].id);
      setFavorites(prev => prev.filter(e => e !== toEmail));
    } else {
      await sendWhiff(toEmail);
    }
  };

  return { isFavorited, hasFavoritedMe, toggleFavorite, sendWhiff, favorites, favoritedBy };
}