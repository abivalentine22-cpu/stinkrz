// Authenticated server gateway preserves the existing entity API used by screens.
const SECURED = new Set(['ScentProfile','ChatMessage','Favorite','ProfileView','TypingIndicator','MessageReaction','StatusPost','Notification','BlockedUser']);

export function secureClient(client) {
  const channels = new Map();
  const call = async (entity, action, params = {}) => {
    try {
      const response = await client.functions.invoke('secureEntities', { entity, action, ...params });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data.result;
    } catch (error) {
      throw error;
    }
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
      if (!listeners.size) return;
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
        if (error?.response?.status === 401) {
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
        if (!listeners.size) generation++;
        listeners.add(callback);
        // New listeners receive the approved snapshot, including existing typing.
        for (const [id,row] of snapshot) callback({ type: 'create', id, data: row });
        if (!timer) {
          const delay = entity === 'TypingIndicator' ? 2000 : entity === 'ScentProfile' ? 15000 : 10000;
          timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, delay);
          document.addEventListener('visibilitychange', refresh);
        }
        void refresh();
        return () => {
          listeners.delete(callback);
          if (!listeners.size) {
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
      if (!SECURED.has(name)) return target[name];
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