import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// All service-role access is constrained here; direct entity access is admin-only.
const OWNERS = {
  ScentProfile: 'user_email', StatusPost: 'user_email', Favorite: 'from_email',
  ProfileView: 'viewer_email', TypingIndicator: 'user_email',
  MessageReaction: 'user_email', Notification: 'user_email', BlockedUser: 'blocker_email',
};
const FIELDS = {
  ScentProfile: ['user_email','display_name','age','bio','avatar_url','photo_gallery','gender','sexuality','scent_category','scent_intensity','vibe_badges','fetishes','sex_kink_tags','sexual_health','shower_frequency','last_showered','looking_for','travel_mode','scent_preferences','location_lat','location_lng','fuzzy_location','invisible_mode','is_online','last_active','last_viewers_check','onboarding_complete','show_online_status','send_read_receipts'],
  StatusPost: ['user_email','display_name','avatar_url','content','vibe_tag','scent_category','expires_at'],
  Favorite: ['from_email','to_email'], ProfileView: ['viewer_email','viewed_email'],
  TypingIndicator: ['user_email','conversation_partner','display_name','expires_at'],
  MessageReaction: ['message_id','user_email','emoji'],
  ChatMessage: ['sender_email','receiver_email','content','is_sticker','sticker_id','media_url','media_type','read'],
  Notification: ['read'], BlockedUser: ['blocker_email','blocked_email'],
};
class Rejection extends Error {
  constructor(message, status = 403) { super(message); this.status = status; }
}
const fail = (message, status = 403) => { throw new Rejection(message, status); };
const pair = (a, b) => ({ $or: [{ blocker_email: a, blocked_email: b }, { blocker_email: b, blocked_email: a }] });
const participant = (email) => ({ $or: [{ sender_email: email }, { receiver_email: email }] });
const snap = (n) => Math.round(n * 100) / 100;

async function all(entity, query, sort = '-created_date') {
  const result = [];
  for (let skip = 0; skip < 10000; skip += 500) {
    const page = await entity.filter(query, sort, 500, skip);
    result.push(...page);
    if (page.length < 500) return result;
  }
  fail('Too many records; narrow the query', 400);
}
async function assertUnblocked(entities, a, b) {
  if (!b || typeof b !== 'string' || b === a) fail('Invalid recipient', 400);
  if ((await entities.BlockedUser.filter(pair(a, b), undefined, 1)).length) fail('Interaction unavailable');
  const profiles = await entities.ScentProfile.filter({ user_email: b }, undefined, 1);
  if (!profiles.length) fail('Interaction unavailable');
}
function sanitizeProfile(row, email) {
  if (row.user_email === email) return row;
  const publicRow = { ...row };
  // Never expose exact GPS to other users, even for legacy precise profiles.
  if (Number.isFinite(row.location_lat)) publicRow.location_lat = snap(row.location_lat);
  if (Number.isFinite(row.location_lng)) publicRow.location_lng = snap(row.location_lng);
  publicRow.fuzzy_location = true;
  delete publicRow.last_viewers_check;
  delete publicRow.send_read_receipts;
  if (row.show_online_status === false) {
    publicRow.is_online = false;
    delete publicRow.last_active;
  }
  return publicRow;
}
async function readRows(entities, entity, email, query) {
  const blocks = await all(entities.BlockedUser, { $or: [{ blocker_email: email }, { blocked_email: email }] });
  const hidden = new Set(blocks.map(b => b.blocker_email === email ? b.blocked_email : b.blocker_email));
  let scope = {};
  if (entity === 'ChatMessage') scope = participant(email);
  if (entity === 'Favorite') scope = { $or: [{ from_email: email }, { to_email: email }] };
  if (entity === 'ProfileView') scope = { $or: [{ viewer_email: email }, { viewed_email: email }] };
  if (entity === 'TypingIndicator') scope = { $or: [{ user_email: email }, { conversation_partner: email }] };
  if (entity === 'Notification') scope = { user_email: email };
  if (entity === 'BlockedUser') scope = { blocker_email: email };
  if (entity === 'MessageReaction') {
    const messages = await all(entities.ChatMessage, participant(email));
    const ids = messages.filter(m => !hidden.has(m.sender_email) && !hidden.has(m.receiver_email)).map(m => m.id);
    if (!ids.length) return [];
    scope = { message_id: { $in: ids } };
  }
  const rows = await all(entities[entity], { $and: [scope, query] });
  return rows.filter(row => {
    if (entity === 'BlockedUser') return true;
    const emails = ['user_email','sender_email','receiver_email','from_email','to_email','viewer_email','viewed_email','conversation_partner','actor_email'];
    if (emails.some(key => hidden.has(row[key]))) return false;
    if (entity === 'ScentProfile' && row.user_email !== email && row.invisible_mode) return false;
    if (entity === 'TypingIndicator' && Date.parse(row.expires_at) <= Date.now()) return false;
    return true;
  }).map(row => entity === 'ScentProfile' ? sanitizeProfile(row, email) : row);
}
export async function handleRequest(req, makeClient = createClientFromRequest) {
  let step = 'init';
  try {
    const client = makeClient(req);
    step = 'auth';
    let me;
    try { me = await client.auth.me(); } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
    if (!me?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { entity, action, id, data = {}, query = {}, sort = '-created_date', limit = 1000, skip = 0 } = await req.json();
    if (!Object.hasOwn(FIELDS, entity)) fail('Unsupported entity', 400);
    step = 'asServiceRole';
    const entities = client.asServiceRole.entities;
    step = 'dispatch';
    if (action === 'list' || action === 'get') {
      if (!query || typeof query !== 'object' || Array.isArray(query)) fail('Invalid query', 400);
      for (const [key, value] of Object.entries(query)) {
        if (!['id', 'created_date', ...(entity === 'Notification' ? ['user_email','actor_email','type','message_id','read'] : FIELDS[entity])].includes(key) || !['string','boolean','number'].includes(typeof value)) fail('Invalid query', 400);
      }
      if (typeof sort !== 'string' || !['id','created_date','updated_date',...FIELDS[entity]].includes(sort.replace(/^-/, ''))) fail('Invalid sort', 400);
      step = 'readRows';
      const rows = await readRows(entities, entity, me.email, action === 'get' ? { id } : query);
      const descending = sort.startsWith('-');
      const key = sort.replace(/^-/, '');
      rows.sort((a,b) => ((a[key] > b[key]) ? 1 : (a[key] < b[key] ? -1 : 0)) * (descending ? -1 : 1));
      if (action === 'get') {
        if (!rows[0]) fail('Record unavailable', 404);
        return Response.json({ result: rows[0] });
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isInteger(skip) || skip < 0) fail('Invalid pagination', 400);
      return Response.json({ result: rows.slice(skip, skip + limit) });
    }
    if (!['create','update','delete'].includes(action)) fail('Unsupported action', 400);
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Invalid data', 400);
    for (const key of Object.keys(data)) if (!FIELDS[entity].includes(key)) fail('Invalid field', 400);
    let row = null;
    if (action !== 'create') {
      row = (await entities[entity].filter({ id }, undefined, 1))[0];
      if (!row) fail('Record unavailable', 404);
      const owner = entity === 'ChatMessage' ? (action === 'update' ? 'receiver_email' : 'sender_email') : OWNERS[entity];
      if (row[owner] !== me.email && !(action === 'delete' && me.role === 'admin' && ['ScentProfile','StatusPost'].includes(entity))) fail('Forbidden');
      if (action === 'delete') {
        await entities[entity].delete(id);
        return Response.json({ result: { success: true } });
      }
    }
    const patch = { ...data };
    const merged = { ...row, ...patch };
    if (entity === 'Notification') {
      if (action === 'create' || Object.keys(patch).some(k => k !== 'read') || typeof patch.read !== 'boolean') fail('Forbidden');
    } else if (entity === 'ChatMessage') {
      if (action === 'create') {
        if (patch.sender_email && patch.sender_email !== me.email) fail('Forbidden');
        patch.sender_email = me.email;
        patch.read = false;
        if (typeof patch.content !== 'string' || !patch.content.trim() || patch.content.length > 10000) fail('Invalid message', 400);
      } else {
        if (Object.keys(patch).some(k => k !== 'read') || patch.read !== true) fail('Forbidden');
        const profiles = await entities.ScentProfile.filter({ user_email: me.email }, undefined, 1);
        if (profiles[0]?.send_read_receipts === false) return Response.json({ result: row });
      }
      await assertUnblocked(entities, me.email, action === 'create' ? patch.receiver_email : row.sender_email);
    } else {
      const owner = OWNERS[entity];
      if (patch[owner] && patch[owner] !== me.email) fail('Forbidden');
      if (action === 'create') patch[owner] = me.email;
      if (entity === 'BlockedUser' && action === 'update') fail('Unblock and create a new block instead', 400);
      if (entity === 'Favorite' || entity === 'ProfileView' || entity === 'TypingIndicator') {
        const targetKey = { Favorite: 'to_email', ProfileView: 'viewed_email', TypingIndicator: 'conversation_partner' }[entity];
        if (row && patch[targetKey] && patch[targetKey] !== row[targetKey]) fail('Recipient cannot change');
        await assertUnblocked(entities, me.email, merged[targetKey]);
        if (entity === 'TypingIndicator') patch.expires_at = new Date(Date.now() + 4000).toISOString();
      }
      if (entity === 'MessageReaction') {
        if (row && patch.message_id && patch.message_id !== row.message_id) fail('Message cannot change');
        const message = (await entities.ChatMessage.filter({ id: merged.message_id }, undefined, 1))[0];
        if (!message || ![message.sender_email,message.receiver_email].includes(me.email)) fail('Forbidden');
        await assertUnblocked(entities, me.email, message.sender_email === me.email ? message.receiver_email : message.sender_email);
        if (typeof merged.emoji !== 'string' || merged.emoji.length > 32) fail('Invalid reaction', 400);
      }
      if (entity === 'BlockedUser') {
        if (!patch.blocked_email || patch.blocked_email === me.email) fail('Invalid block', 400);
        const existing = await entities.BlockedUser.filter({ blocker_email: me.email, blocked_email: patch.blocked_email }, undefined, 1);
        if (existing[0]) return Response.json({ result: existing[0] });
      }
      if (entity === 'ScentProfile') {
        if (patch.age !== undefined && (!Number.isInteger(patch.age) || patch.age < 18 || patch.age > 120)) fail('Stinkrz is for adults 18 or older', 400);
        if (action === 'create') {
          patch.fuzzy_location = patch.fuzzy_location !== false;
          patch.show_online_status = patch.show_online_status !== false;
          patch.send_read_receipts = patch.send_read_receipts !== false;
        }
        const effective = { ...row, ...patch };
        const lat = patch.location_lat ?? row?.location_lat;
        const lng = patch.location_lng ?? row?.location_lng;
        if (lat != null || lng != null) {
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) fail('Invalid location', 400);
          if (effective.fuzzy_location !== false) {
            patch.location_lat = snap(lat); patch.location_lng = snap(lng);
          }
        }
        if (effective.invisible_mode) { patch.location_lat = null; patch.location_lng = null; }
        if (effective.show_online_status === false) { patch.is_online = false; patch.last_active = null; }
      }
    }
    const result = action === 'create' ? await entities[entity].create(patch) : await entities[entity].update(id, patch);
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: (error instanceof Rejection ? error.message : (error?.message || 'Request failed')) + ' [step: ' + step + ']' }, { status: error.status || 500 });
  }
}
Deno.serve(handleRequest);