// Privacy helpers for the location-refresh / presence system.

// Snap exact coordinates to a ~1 km grid (2 decimal places ≈ 1.1 km).
// Used for "fuzzy location" mode so we never store a precise point.
export function snapToFuzzy(lat, lng) {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

// Build the patch to persist for a profile given fresh GPS coordinates.
// Respects the user's privacy toggles:
//   - invisible_mode: don't store/update location at all (just stay "online")
//   - fuzzy_location: store a coarse ~1 km snap instead of the exact point
//   - otherwise: store the exact coordinates
// Always includes is_online + last_active so presence stays fresh.
export function locationPatch(lat, lng, profile) {
  const patch = {
    is_online: true,
    last_active: new Date().toISOString(),
  };

  if (profile && !profile.invisible_mode) {
    const coords = profile.fuzzy_location ? snapToFuzzy(lat, lng) : { lat, lng };
    patch.location_lat = coords.lat;
    patch.location_lng = coords.lng;
  }

  return patch;
}