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
      // Remove favorite
      const all = await base44.entities.Favorite.filter({ from_email: myEmail, to_email: toEmail });
      if (all[0]) await base44.entities.Favorite.delete(all[0].id);
      setFavorites(prev => prev.filter(e => e !== toEmail));
    } else {
      await base44.entities.Favorite.create({ from_email: myEmail, to_email: toEmail });
      setFavorites(prev => [...prev, toEmail]);
    }
  };

  return { isFavorited, hasFavoritedMe, toggleFavorite, favoritedBy };
}