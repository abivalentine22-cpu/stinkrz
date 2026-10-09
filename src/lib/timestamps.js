// Base44 server-generated timestamps can omit the UTC suffix.
// Preserve explicit offsets; interpret timezone-less server datetimes as UTC.
export function parseServerTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return new Date(NaN);
  let iso = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i.test(iso)) return new Date(NaN);
  iso = iso.replace(/(\.\d{3})\d+/, '$1');
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso)) iso += 'Z';
  return new Date(iso);
}
