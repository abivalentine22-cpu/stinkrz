import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
let source = await readFile('base44/functions/deleteAccount/entry.ts', 'utf8');
source = source.replace(/^import .*createClientFromRequest.*;\n/, 'const createClientFromRequest = () => globalThis.deletionClient;\n');
source = source.replace('Deno.serve(async (req) => {', 'export const handler = async (req) => {').replace(/\}\);\s*$/, '};');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const { handler } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const email = 'self@example.com';
const user = { id: 'self', email };
const request = () => new Request('https://example.com', { method: 'POST', body: JSON.stringify({ email: 'victim@example.com', user_id: 'victim' }) });
function matches(record, query) {
  return Object.entries(query).every(([field, value]) =>
    field === '$or' ? value.some(q => matches(record, q)) :
    value && typeof value === 'object' ? value.$in.includes(record[field]) : record[field] === value);
}
function setup(data = {}, fail = '') {
  const deleted = [], updated = [], pages = [];
  globalThis.deletionClient = {
    auth: { me: async () => user },
    asServiceRole: { entities: new Proxy({}, { get: (_, name) => ({
      filter: async (query, sort, limit, skip) => {
        pages.push([name, skip]);
        return (data[name] || []).filter(r => matches(r, query)).sort((a,b) => a.id.localeCompare(b.id)).slice(skip, skip + limit);
      },
      update: async (id, patch) => { updated.push([name,id,patch]); Object.assign(data[name].find(r => r.id === id),patch); },
      delete: async id => {
        if (name === fail) throw new Error('SECRET failure');
        deleted.push([name,id]);
        data[name] = (data[name] || []).filter(r => r.id !== id);
        return { success: true };
      },
    }) }) },
  };
  return { deleted, updated, pages };
}
test('unauthenticated and incomplete identities never access privileged records', async () => {
  for (const identity of [null, {}, { id: 'self' }]) {
    globalThis.deletionClient = { auth: { me: async () => identity }, get asServiceRole() { throw new Error('unexpected access'); } };
    assert.equal((await handler(request())).status, 401);
  }
});
test('all pages, both referral directions, tokens, partner typing and related reactions are cleaned; User is last', async () => {
  const data = {
    ScentProfile: Array.from({length:205}, (_,i) => ({ id: String(i).padStart(3,'0'), user_email: email })),
    PushToken: [{id:'token',user_email:email},{id:'other-token',user_email:'other'}],
    Referral: [{id:'out',referrer_email:email},{id:'in',referred_email:email}],
    ChatMessage: [{id:'message',sender_email:email,receiver_email:email},{id:'other-message',sender_email:'other',receiver_email:'another'}],
    MessageReaction: [{id:'related',message_id:'message',user_email:'other'},{id:'own',message_id:'message',user_email:email},{id:'keep',message_id:'other-message',user_email:'other'}],
    TypingIndicator: [{id:'partner',user_email:'other',conversation_partner:email}],
    Report: [{id:'filed',reporter_email:email,reported_user_email:'other'},{id:'about',reporter_email:'other',reported_user_email:email,reported_user_name:'Name',details:'Evidence'}],
  };
  const { deleted, updated, pages } = setup(data);
  const response = await handler(request());
  assert.equal(response.status,200);
  assert.equal((await response.json()).account_deleted,true);
  assert.equal(deleted.filter(([name]) => name === 'ScentProfile').length,205);
  assert.ok(pages.some(([name,skip]) => name === 'ScentProfile' && skip === 200));
  assert.deepEqual(deleted.at(-1),['User','self']);
  assert.equal(deleted.filter(([name,id]) => name === 'MessageReaction' && id === 'own').length,1);
  assert.ok(deleted.find(([name,id]) => name === 'MessageReaction' && id === 'related'));
  assert.deepEqual(data.MessageReaction.map(r => r.id),['keep']);
  assert.deepEqual(data.PushToken.map(r => r.id),['other-token']);
  assert.deepEqual(data.ChatMessage.map(r => r.id),['other-message']);
  assert.equal(data.Referral.length,0);
  assert.equal(data.TypingIndicator.length,0);
  assert.equal(updated[0][2].reported_user_email,'[deleted]');
  assert.equal(data.Report[0].details,'Evidence');
});
test('cleanup failure keeps login identity for retry and never reports success or exposes internal errors', async () => {
  const { deleted } = setup({ PushToken: [{id:'token',user_email:email}] }, 'PushToken');
  const response = await handler(request());
  assert.equal(response.status,500);
  assert.equal(deleted.some(([name]) => name === 'User'),false);
  assert.equal(JSON.stringify(await response.json()).includes('SECRET'),false);
});
test('login deletion failure is not reported as successful', async () => {
  setup({},'User');
  assert.equal((await handler(request())).status,500);
});
