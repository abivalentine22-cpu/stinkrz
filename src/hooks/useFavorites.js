import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useFavorites(myEmail) {
  const [favorites, setFavorites] = useState([]); // emails I've favorited
  const [favoritedBy, setFavoritedBy] = useState([]); // emails who favorited me

  useEffect(() => {
    if (!myEmail) return;
    base44.entities.Favorite.filter({ from_email: myEmail }).then(f => setFavorites(f.map(x => x.to_email)));
    base44.entities.Favorite.filter({ to_email: myEmail }).then(f => setFavoritedBy(f.map(x => x.from_email)));
  }, [myEmail]);

  const isFavorited = (email) => favorites.includes(email);
  const hasFavoritedMe = (email) => favoritedBy.includes(email);

  const toggleFavorite = async (toEmail) => {
    if (isFavorited(toEmail)) {
      const all = await base44.entities.Favorite.filter({ from_email: myEmail, to_email: toEmail });
      if (all[0]) await base44.entities.Favorite.delete(all[0].id);
      setFavorites(prev => prev.filter(e => e !== toEmail));
    } else {
      await base44.entities.Favorite.create({ from_email: myEmail, to_email: toEmail });
      setFavorites(prev => [...prev, toEmail]);

      // Check if it's mutual — if so, notify both parties
      const theyFavoriteMe = favoritedBy.includes(toEmail);
      if (theyFavoriteMe) {
        // Notify the other person
        base44.entities.Notification.create({
          user_email: toEmail,
          type: "status_interaction",
          actor_email: myEmail,
          actor_name: "Someone",
          title: "💞 It's a match!",
          description: "You both favorited each other",
          read: false,
        });
        // Notify self
        base44.entities.Notification.create({
          user_email: myEmail,
          type: "status_interaction",
          actor_email: toEmail,
          actor_name: "Someone",
          title: "💞 It's a match!",
          description: "You both favorited each other",
          read: false,
        });
      }
    }
  };

  return { isFavorited, hasFavoritedMe, toggleFavorite, favoritedBy };
}