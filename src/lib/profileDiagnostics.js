// Memory-only timing metadata. Never store queries, identifiers, or row content.
let entries = [];
let sequence = 0;
const listeners = new Set();
const publish = () => listeners.forEach(fn => fn());
export const getProfileDiagnostics = () => entries;
export const subscribeProfileDiagnostics = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export function startProfileDiagnostic(action, params, activeReads) {
  const id = ++sequence;
  entries = [...entries.slice(-19), {
    id, started: Date.now(), state: "pending", activeReads, shared: 0,
    kind: action === "get" ? "Single profile" : Object.keys(params.query || {}).length ? "Filtered profiles" : "Map profiles",
  }];
  publish();
  return id;
}
export function updateProfileDiagnostic(id, patch) {
  entries = entries.map(entry => entry.id === id ? { ...entry, ...patch } : entry);
  publish();
}
export function shareProfileDiagnostic(id) {
  const entry = entries.find(item => item.id === id);
  if (entry) updateProfileDiagnostic(id, { shared: entry.shared + 1 });
}
