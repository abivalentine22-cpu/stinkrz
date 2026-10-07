// The app's sole existing administrator account; other admins receive the normal map.
const OWNER_ACCOUNT_ID = "69faa8a3ff7324c96aef6557";
const ACTIVITY_TIMEOUT_MINS = 45;

export function hasOwnerMapView(user) {
  return user?.id === OWNER_ACCOUNT_ID && user?.role === "admin";
}

export function visibleMapProfile(profile, user, now = Date.now()) {
  if (!Number.isFinite(profile.location_lat) || !Number.isFinite(profile.location_lng)) return null;
  if (profile.invisible_mode) return null;
  if (!hasOwnerMapView(user) && profile.show_online_status !== false) {
    const minutesSince = profile.last_active ? (now - Date.parse(profile.last_active)) / 60000 : Infinity;
    if (!profile.is_online || !Number.isFinite(minutesSince) || minutesSince > ACTIVITY_TIMEOUT_MINS) return null;
  }
  return profile;
}
