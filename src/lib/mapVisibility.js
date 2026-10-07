// The app's sole existing administrator account; other admins receive the normal map.
const OWNER_ACCOUNT_ID = "69faa8a3ff7324c96aef6557";
const ACTIVITY_TIMEOUT_MINS = 48 * 60;
const ONLINE_TIMEOUT_MINS = 15;

export function hasOwnerMapView(user) {
  return user?.id === OWNER_ACCOUNT_ID && user?.role === "admin";
}

export function visibleMapProfile(profile, user, now = Date.now()) {
  if (!Number.isFinite(profile.location_lat) || !Number.isFinite(profile.location_lng)) return null;
  if (profile.invisible_mode) return null;
  if (!hasOwnerMapView(user) && profile.show_online_status !== false) {
    const minutesSince = profile.last_active ? (now - Date.parse(profile.last_active)) / 60000 : Infinity;
    if (!Number.isFinite(minutesSince) || minutesSince > ACTIVITY_TIMEOUT_MINS) return null;
  }
  const minutesSince = profile.last_active ? (now - Date.parse(profile.last_active)) / 60000 : Infinity;
  return {
    ...profile,
    is_online: profile.show_online_status !== false && !!profile.is_online &&
      Number.isFinite(minutesSince) && minutesSince >= 0 && minutesSince <= ONLINE_TIMEOUT_MINS,
  };
}
