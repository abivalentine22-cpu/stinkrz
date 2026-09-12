// Geographic distance helpers (miles).
// Used to determine whether another user falls within a local radius
// (e.g. the Live Feed's 25-mile filter). Coordinates are used only to
// compute eligibility — never exposed back to the UI.

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinMiles(lat1, lng1, lat2, lng2, miles) {
  return haversineDistance(lat1, lng1, lat2, lng2) <= miles;
}