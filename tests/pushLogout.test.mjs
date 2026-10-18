import test from 'node:test';
import assert from 'node:assert/strict';
import { createPushDeviceManager } from '../src/lib/pushDeviceManager.js';
function fixture() {
  const rows = [{ id: 'other-device', user_email: 'a', token: 'phone' }];
  const events = [];
  let serial = 0;
  const entity = {
    filter: async query => rows.filter(row => Object.entries(query).every(([k,v]) => row[k] === v)),
    create: async data => { const row = { id: String(++serial), ...data }; rows.push(row); events.push('create'); return row; },
    delete: async id => { rows.splice(rows.findIndex(row => row.id === id), 1); events.push('delete'); },
  };
  const manager = createPushDeviceManager({ supported: () => true, revoke: async () => events.push('revoke'), acquire: async () => 'browser' });
  return { rows, events, entity, manager, client: { entities: { PushToken: entity } } };
}
test('logout removes this browser duplicates, preserves other devices, and revokes before SDK logout', async () => {
  const f = fixture();
  await f.manager.register(f.client, 'a');
  f.rows.push({id:'duplicate',user_email:'a',token:'browser'});
  await f.manager.logout(f.client, () => f.events.push('logout'));
  assert.deepEqual(f.rows.map(row=>row.id), ['other-device']);
  assert.equal(f.events.at(-1), 'logout');
  assert.equal(f.events.filter(e=>e==='revoke').length, 2);
});
test('logout waits for an in-flight create then removes it', async () => {
  const f=fixture(); let release; let started;
  const began=new Promise(r=>{started=r;});
  const gate=new Promise(r=>{release=r;});
  const create=f.entity.create;
  f.entity.create=async data=>{started(); await gate; return create(data);};
  const setup=f.manager.register(f.client,'a');
  await began;
  const logout=f.manager.logout(f.client,()=>f.events.push('logout'));
  release(); await Promise.all([setup,logout]);
  assert.equal(f.rows.some(row=>row.token==='browser'),false);
  assert.equal(f.events.at(-1),'logout');
});
test('a cancelled setup cannot create a registration after its lookup', async () => {
  const f=fixture(); let cancelled=false;
  f.entity.filter=async()=>{cancelled=true;return [];};
  await f.manager.register(f.client,'a',()=>cancelled);
  assert.equal(f.events.includes('create'),false);
});
test('DB failure still revokes provider and completes logout', async () => {
  const f=fixture(); await f.manager.register(f.client,'a');
  f.entity.filter=async()=>{throw new Error('offline');};
  await f.manager.logout(f.client,()=>f.events.push('logout'));
  assert.equal(f.events.filter(e=>e==='revoke').length,2);
  assert.equal(f.events.at(-1),'logout');
});
test('sign-in can register again after a logout without redirect', async () => {
  const f=fixture();await f.manager.register(f.client,'a');
  await f.manager.logout(f.client,()=>{});
  await f.manager.register(f.client,'b');
  assert.equal(f.rows.find(row=>row.token==='browser')?.user_email,'b');
});
