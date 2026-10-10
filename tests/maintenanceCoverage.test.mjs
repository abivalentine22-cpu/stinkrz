import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
async function load(name) {
  let source = await readFile(`base44/functions/${name}/entry.ts`, 'utf8');
  source = source.replace(/^import .*createClientFromRequest.*;\n/, 'const createClientFromRequest = () => globalThis.coverageClient;\n');
  source = source.replace('Deno.serve(async (req) => {','export const handler = async (req) => {').replace(/\}\);\s*$/, '};');
  const {code} = await transform(source,{loader:'ts',format:'esm'});
  return (await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).handler;
}
const owner = { id:'69faa8a3ff7324c96aef6557', role:'admin' };
const request = () => new Request('https://example.com');
for (const name of ['markOfflineUsers','cleanupOldNotifications','deleteExpiredPosts','cleanupTypingIndicators','sendMissedMessageEmail']) {
  const handler = await load(name);
  test(`${name} reads beyond the first page before changing records`,async () => {
    const pages=[], writes=[];
    let active=0, peak=0;
    async function write(id) {
      active++; peak=Math.max(peak,active);
      await new Promise(resolve=>setTimeout(resolve,1));
      writes.push(id); active--; return {success:true};
    }
    const records=Array.from({length:205},(_,i)=>({
      id:String(i),is_online:true,last_active:'2000-01-01T00:00:00Z',
      created_date:'2000-01-01T00:00:00Z',expires_at:'2000-01-01T00:00:00Z',
      read:true,user_email:'user'+i,
    }));
    globalThis.coverageClient={
      auth:{me:async()=>owner},
      asServiceRole:{entities:new Proxy({}, {get:(_,entity)=>({
        list:async(sort,limit,skip)=>{pages.push([entity,skip]);return records.slice(skip,skip+limit);},
        delete:write,
        update:write,
      })})},
    };
    const response=await handler(request());
    assert.equal(response.status,200);
    assert.ok(pages.some(([,skip])=>skip===200));
    if(name!=='sendMissedMessageEmail') { assert.equal(writes.length,205); assert.ok(peak<=10, `Peak concurrency: ${peak}`); }
  });
}
const notify = await load('notifyExpiringPosts');
function reminderClient(failCreate=false) {
  const posts=Array.from({length:205},(_,i)=>({
    id:String(i),user_email:'member',display_name:'Member',content:'Hello',
    expires_at:new Date(Date.now()+10*60000).toISOString(),expiry_reminder_sent:false,
  }));
  let created=0;
  globalThis.coverageClient={
    auth:{me:async()=>owner},
    asServiceRole:{entities:{
      StatusPost:{
        list:async(sort,limit,skip)=>posts.slice(skip,skip+limit),
        updateMany:async(query,patch)=>{
          const post=posts.find(p=>p.id===query.id);
          if (query.expiry_reminder_claim_id && post.expiry_reminder_claim_id!==query.expiry_reminder_claim_id) return {success:true,updated:0};
          if (query.$or && (post.expiry_reminder_sent || post.expiry_reminder_claim_until>Date.now())) return {success:true,updated:0};
          Object.assign(post,patch.$set);
          return {success:true,updated:1};
        },
        update:async(id,patch)=>Object.assign(posts.find(p=>p.id===id),patch),
      },
      Notification:{filter:async()=>[],create:async record=>{
        if(failCreate) throw new Error('failed');
        assert.ok(record.message_id);
        assert.match(record.description,/~10 minutes/);
        created++;
      }},
    }},
  };
  return {posts,get created(){return created;}};
}
test('expiry reminders cover every page and deduplicate repeated and overlapping runs',async()=>{
  const state=reminderClient();
  const responses=await Promise.all([notify(request()),notify(request())]);
  for(const response of responses) assert.equal(response.status,200);
  assert.equal(state.created,205);
  assert.equal((await notify(request())).status,200);
  assert.equal(state.created,205);
});
test('failed reminder creation releases claim for retry',async()=>{
  const state=reminderClient(true);
  assert.equal((await notify(request())).status,500);
  assert.equal(state.posts[0].expiry_reminder_sent,false);
});
test('offline workflow interval matches its ten-minute name',async()=>{
  const workflow=JSON.parse(await readFile('base44/workflows/Mark Offline Users (Every 10 min).jsonc','utf8'));
  assert.equal(workflow.trigger.config.interval_value,10);
  assert.equal(workflow.trigger.config.interval_unit,'minutes');
});
