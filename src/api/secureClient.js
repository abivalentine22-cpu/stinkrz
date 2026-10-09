import { startProfileDiagnostic, updateProfileDiagnostic, shareProfileDiagnostic } from "../lib/profileDiagnostics.js";

// Authenticated server gateway preserves the existing entity API used by screens.
const SECURED = new Set(['ScentProfile','ChatMessage','Favorite','ProfileView','TypingIndicator','MessageReaction','StatusPost','Notification','BlockedUser']);

export function secureClient(client) {
  const channels = new Map();
  const inFlightReads = new Map();
  const diagnosticIds = new Map();
  const invoke = async (entity, action, params = {}, diagnosticId) => {
    const started = Date.now();
    try {
      const response = await client.functions.invoke('secureEntities', { entity, action, ...params });
      if (response.data?.error) throw new Error(response.data.error);
      if (diagnosticId) updateProfileDiagnostic(diagnosticId, {
        state: "complete", duration: Date.now() - started, status: response.status || 200,
        server: response.data?.diagnostics || null,
      });
      return response.data.result;
    } catch (error) {
      if (diagnosticId) updateProfileDiagnostic(diagnosticId, {
        state: "failed", duration: Date.now() - started,
        status: error?.response?.status || error?.status || null,
        server: error?.response?.data?.diagnostics || null,
      });
      throw error;
    }
  };
  const call = (entity, action, params = {}) => {
    if (action !== 'list' && action !== 'get') return invoke(entity, action, params);
    const normalized = action === 'list'
      ? { query: {}, sort: '-created_date', limit: 1000, skip: 0, ...params }
      : params;
    const key = JSON.stringify([entity, action, normalized]);
    if (inFlightReads.has(key)) {
      shareProfileDiagnostic(diagnosticIds.get(key));
      return inFlightReads.get(key);
    }
    const diagnosticId = entity === "ScentProfile" ? startProfileDiagnostic(action, normalized, inFlightReads.size) : null;
    if (diagnosticId) diagnosticIds.set(key, diagnosticId);
    const request = invoke(entity, action, normalized, diagnosticId).finally(() => {
      if (inFlightReads.get(key) === request) {
        inFlightReads.delete(key);
        diagnosticIds.delete(key);
      }
    });
    inFlightReads.set(key, request);
    return request;
  };
  const channelFor = (entity) => {
    if (channels.has(entity)) return channels.get(entity);
    const listeners = new Set();
    let snapshot = new Map();
    let running = false;
    let pending = false;
    let timer = null;
    let generation = 0;
    const refresh = async () => {
      if (!listeners.size || document.visibilityState !== 'visible') return;
      if (running) { pending = true; return; }
      running = true;
      const requestGeneration = generation;
      try {
        const rows = await call(entity, 'list', { limit: 1000 });
        if (requestGeneration !== generation || !listeners.size) return;
        const next = new Map(rows.map(row => [row.id, row]));
        const emit = (event) => listeners.forEach(fn => fn(event));
        for (const [id, row] of next) {
          if (!snapshot.has(id)) emit({ type: 'create', id, data: row });
          else if (JSON.stringify(snapshot.get(id)) !== JSON.stringify(row)) emit({ type: 'update', id, data: row });
        }
        for (const [id, row] of snapshot) if (!next.has(id)) emit({ type: 'delete', id, data: row });
        snapshot = next;
      } catch (error) {
        // Never fall back to raw entity access on errors.
        if (requestGeneration === generation && listeners.size && error?.response?.status === 401) {
          for (const [id,row] of snapshot) listeners.forEach(fn => fn({ type: 'delete', id, data: row }));
          snapshot = new Map();
        }
      } finally {
        running = false;
        if (pending) { pending = false; void refresh(); }
      }
    };
    const channel = {
      refresh,
      subscribe(callback) {
        const firstListener = !listeners.size;
        if (firstListener) generation++;
        listeners.add(callback);
        // New listeners receive the approved snapshot, including existing typing.
        for (const [id,row] of snapshot) callback({ type: 'create', id, data: row });
        if (!timer) {
          const delay = entity === 'TypingIndicator' ? 5000 : entity === 'ScentProfile' ? 15000 : entity === 'ChatMessage' ? 10000 : entity === 'Notification' || entity === 'ProfileView' ? 30000 : 20000;
          timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, delay);
          document.addEventListener('visibilitychange', refresh);
        }
        // Existing listeners already own a refresh loop and any pending read.
        // Joining it must not queue a second fetch after that read completes.
        if (firstListener) void refresh();
        return () => {
          listeners.delete(callback);
          if (!listeners.size) {
            // Do not reuse pending reads when the old screen/session is torn down.
            // Tearing down notifications must not discard a pending profile
            // read and cause the new screen to send the same request again.
            for (const key of inFlightReads.keys()) {
              if (JSON.parse(key)[0] === entity) {
                inFlightReads.delete(key);
                diagnosticIds.delete(key);
              }
            }
            generation++;
            clearInterval(timer); timer = null; snapshot = new Map();
            document.removeEventListener('visibilitychange', refresh);
          }
        };
      },
    };
    channels.set(entity, channel);
    return channel;
  };
  const handlers = new Map();
  const entities = new Proxy(client.entities, {
    get(target, name) {
      if (typeof name !== 'string' || !SECURED.has(name)) return target[name];
      if (!handlers.has(name)) {
        const mutate = async (action, params) => {
          const result = await call(name, action, params);
          if (name === 'BlockedUser') channels.forEach(c => void c.refresh());
          else if (channels.has(name)) void channels.get(name).refresh();
          return result;
        };
        handlers.set(name, {
          list: (sort = '-created_date', limit = 1000, skip = 0) => call(name, 'list', { sort, limit, skip }),
          filter: (query, sort = '-created_date', limit = 1000, skip = 0) => call(name, 'list', { query, sort, limit, skip }),
          get: id => call(name, 'get', { id }),
          create: data => mutate('create', { data }),
          update: (id,data) => mutate('update', { id,data }),
          delete: id => mutate('delete', { id }),
          subscribe: callback => channelFor(name).subscribe(callback),
        });
      }
      return handlers.get(name);
    },
  });
  return new Proxy(client, { get(target, key) { return key === 'entities' ? entities : target[key]; } });
}