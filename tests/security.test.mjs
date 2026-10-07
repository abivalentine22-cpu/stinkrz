import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

async function loadHandler(path) {
  let source = await readFile(path, 'utf8');
  source = source.replace(/^import .*createClientFromRequest.*;\n/, 'const createClientFromRequest = req => globalThis.testClient;\n');
  source = source.replace('Deno.serve(handleRequest);', '');
  source = source.replace('Deno.serve((req) => handleRequest(req));', 'export const runtimeGateway = (req) => handleRequest(req);');
  source = source.replace('Deno.serve(async (req) => {', 'export const capturedHandler = async (req) => {');
  if (source.includes('capturedHandler')) source = source.replace(/\}\);\s*$/, '};');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const gatewayModule = await loadHandler('base44/functions/secureEntities/entry.ts');
const gateway = gatewayModule.handleRequest;
const messageNotification = (await loadHandler('base44/functions/createMessageNotification/entry.ts')).capturedHandler;
const whiffNotification = (await loadHandler('base44/functions/sendWhiffNotification/entry.ts')).default;
const statusNotification = (await loadHandler('base44/functions/createStatusInteractionNotification/entry.ts')).capturedHandler;
const push = (await loadHandler('base44/functions/sendPushNotification/entry.ts')).capturedHandler;

function matches(row, query) {
  return Object.entries(query).every(([key,value]) => {
    if (key === '$and') return value.every(q => matches(row,q));
    if (key === '$or') return value.some(q => matches(row,q));
    if (value && typeof value === 'object') {
      if ('$in' in value) return value.$in.includes(row[key]);
      throw new Error('Unimplemented mock operator');
    }
    return row[key] === value;
  });
}
function fixture(blocks = [], me = 'alice@example.com') {
  const database = {
    ScentProfile: [
      { id:'pa',user_email:'alice@example.com',display_name:'Alice',fuzzy_location:true,location_lat:45.123456,location_lng:-122.987654,send_read_receipts:true },
      { id:'pb',user_email:'bob@example.com',display_name:'Bob',fuzzy_location:false,location_lat:46.123456,location_lng:-121.987654,is_online:true,last_active:'2026-10-06T00:00:00Z',show_online_status:false },
      { id:'pc',user_email:'carol@example.com',display_name:'Carol',invisible_mode:true },
    ],
    ChatMessage: [
      { id:'m1',sender_email:'alice@example.com',receiver_email:'bob@example.com',content:'Hi',read:false },
      { id:'m2',sender_email:'bob@example.com',receiver_email:'alice@example.com',content:'Hey',read:false },
      { id:'m3',sender_email:'bob@example.com',receiver_email:'carol@example.com',content:'Private',read:false },
    ],
    Favorite:[{id:'f1',from_email:'alice@example.com',to_email:'bob@example.com'}],
    ProfileView:[], TypingIndicator:[], MessageReaction:[{id:'r1',message_id:'m1',user_email:'bob@example.com',emoji:'👃'},{id:'r3',message_id:'m3',user_email:'bob@example.com',emoji:'👃'}],
    Notification:[{id:'n1',user_email:'bob@example.com',actor_email:'carol@example.com',type:'new_message',title:'Private'}],
    BlockedUser:blocks, StatusPost:[{id:'p1',user_email:'bob@example.com',display_name:'Bob',content:'Hello',expires_at:'2099-01-01T00:00:00Z'}],
  };
  const writes = [];
  const entities = Object.fromEntries(Object.entries(database).map(([name,rows]) => [name, {
    async filter(query={},sort,limit=500,skip=0) { return rows.filter(r => matches(r,query)).slice(skip,skip+limit).map(r => ({...r})); },
    async create(data) { const row = {id:'created-'+writes.length,...data}; rows.push(row);writes.push([name,'create',row]);return row; },
    async update(id,data) { const row=rows.find(r=>r.id===id);Object.assign(row,data);writes.push([name,'update',data]);return {...row}; },
    async delete(id) { const index=rows.findIndex(r=>r.id===id);rows.splice(index,1);writes.push([name,'delete',id]); },
  }]));
  const client={auth:{async me(){return me ? {email:me,role:'user'}:null;}},asServiceRole:{entities},functions:{async invoke(){return {data:{success:true}};}}};
  const invoke=async (payload,handler=gateway) => {
    globalThis.testClient=client;
    const req=new Request('https://test.invalid',{method:'POST',body:JSON.stringify(payload)});
    const response=await handler(req,()=>client);
    return {status:response.status,body:await response.json()};
  };
  return {database,writes,invoke};
}
const block = (reverse=false) => [{id:'b1',blocker_email:reverse?'bob@example.com':'alice@example.com',blocked_email:reverse?'alice@example.com':'bob@example.com'}];

test('production Deno handler ignores connection info and supports profile reads and saves', async () => {
 const f = fixture();
 globalThis.testClient = { auth: { me: async () => ({email:'alice@example.com'}) }, asServiceRole: { entities: {} } };
 // Use the same fixture client through invoke, but pass Deno's second argument rather than a factory.
 const runtime = (req) => gatewayModule.runtimeGateway(req, {remoteAddr:{transport:'tcp',hostname:'127.0.0.1',port:443}});
 const read = await f.invoke({entity:'ScentProfile',action:'list'}, runtime);
 assert.equal(read.status,200);
 assert.ok(read.body.result.some(p=>p.id==='pa'));
 const save = await f.invoke({entity:'ScentProfile',action:'update',id:'pa',data:{bio:'Updated bio'}},runtime);
 assert.equal(save.status,200);
 assert.equal(f.database.ScentProfile[0].bio,'Updated bio');
});

test('unauthenticated reads and writes are denied', async()=> {
 const f=fixture([],null);
 assert.equal((await f.invoke({entity:'ScentProfile',action:'list'})).status,401);
 assert.equal((await f.invoke({entity:'ChatMessage',action:'create',data:{content:'Hello',receiver_email:'bob@example.com'}})).status,401);
});
test('normal messaging succeeds and the server owns sender/read fields',async()=>{
 const f=fixture();const r=await f.invoke({entity:'ChatMessage',action:'create',data:{content:'Hello',receiver_email:'bob@example.com',read:true}});
 assert.equal(r.status,200);assert.equal(r.body.result.sender_email,'alice@example.com');assert.equal(r.body.result.read,false);
});
for (const reverse of [false,true]) {
 for (const [entity,data] of [
  ['ChatMessage',{content:'Hello',receiver_email:'bob@example.com'}],
  ['Favorite',{to_email:'bob@example.com'}],
  ['ProfileView',{viewed_email:'bob@example.com'}],
  ['TypingIndicator',{conversation_partner:'bob@example.com'}],
  ['MessageReaction',{message_id:'m1',emoji:'👃'}],
 ]) test(entity+' blocked '+(reverse?'recipient':'sender')+' direction',async()=>{
  const f=fixture(block(reverse));assert.equal((await f.invoke({entity,action:'create',data})).status,403);assert.equal(f.writes.length,0);
 });
 test('block filters profiles, messages, posts and reactions '+reverse,async()=>{
  const f=fixture(block(reverse));
  for(const entity of ['ScentProfile','ChatMessage','StatusPost','MessageReaction']) {
   const r=await f.invoke({entity,action:'list'});assert.equal(r.status,200);
   assert.ok(r.body.result.every(row=>row.user_email!=='bob@example.com'&&row.sender_email!=='bob@example.com'&&row.receiver_email!=='bob@example.com'));
   if(entity==='MessageReaction') assert.equal(r.body.result.length,0);
  }
 });
}
test('public profiles expose coarse location and hide activity; owner gets own profile',async()=>{
 const f=fixture();const r=await f.invoke({entity:'ScentProfile',action:'list'});
 const bob=r.body.result.find(p=>p.id==='pb');assert.equal(bob.location_lat,46.12);assert.equal(bob.location_lng,-121.99);assert.equal(bob.is_online,false);assert.equal(bob.last_active,undefined);
 assert.equal(r.body.result.find(p=>p.id==='pa').location_lat,45.123456);assert.equal(r.body.result.find(p=>p.id==='pc'),undefined);
});
test('profile writes respect approximate, invisible and activity privacy',async()=>{
 const f=fixture();const r=await f.invoke({entity:'ScentProfile',action:'update',id:'pa',data:{location_lat:45.98765,location_lng:-123.12345,show_online_status:false,is_online:true}});
 assert.equal(r.body.result.location_lat,45.99);assert.equal(r.body.result.is_online,false);assert.equal(r.body.result.last_active,null);
 const invisible=await f.invoke({entity:'ScentProfile',action:'update',id:'pa',data:{invisible_mode:true}});
 assert.equal(invisible.body.result.location_lat,null);assert.equal(invisible.body.result.location_lng,null);
});
test('age policy accepts adults and rejects underage values',async()=>{
 const f=fixture();assert.equal((await f.invoke({entity:'ScentProfile',action:'update',id:'pa',data:{age:17}})).status,400);
 assert.equal((await f.invoke({entity:'ScentProfile',action:'update',id:'pa',data:{age:18}})).status,200);
});
test('identity spoofing and ownership bypass are denied',async()=>{
 const f=fixture();
 assert.equal((await f.invoke({entity:'ChatMessage',action:'create',data:{sender_email:'bob@example.com',receiver_email:'carol@example.com',content:'Fake'}})).status,403);
 assert.equal((await f.invoke({entity:'ScentProfile',action:'update',id:'pb',data:{bio:'Fake'}})).status,403);
 assert.equal((await f.invoke({entity:'ChatMessage',action:'update',id:'m1',data:{read:true}})).status,403);
 assert.equal((await f.invoke({entity:'Notification',action:'create',data:{read:true}})).status,403);
});
test('read receipt refusal persists on the server',async()=>{
 const f=fixture();f.database.ScentProfile[0].send_read_receipts=false;
 const r=await f.invoke({entity:'ChatMessage',action:'update',id:'m2',data:{read:true}});
 assert.equal(r.status,200);assert.equal(r.body.result.read,false);assert.equal(f.writes.length,0);
});
test('recipients can only update read state, never message identities/content',async()=>{
 const f=fixture();assert.equal((await f.invoke({entity:'ChatMessage',action:'update',id:'m2',data:{content:'Edited'}})).status,403);
 assert.equal((await f.invoke({entity:'ChatMessage',action:'update',id:'m2',data:{read:true}})).status,200);
});
test('reactions are private to message participants',async()=>{
 const f=fixture();const r=await f.invoke({entity:'MessageReaction',action:'list'});
 assert.deepEqual(r.body.result.map(r=>r.id),['r1']);
 assert.equal((await f.invoke({entity:'MessageReaction',action:'create',data:{message_id:'m3',emoji:'👃'}})).status,403);
});
test('operator injection, unknown entity and invalid pagination are denied',async()=>{
 const f=fixture();
 for(const payload of [{entity:'User',action:'list'},{entity:'ChatMessage',action:'list',query:{$or:[]}},{entity:'ScentProfile',action:'list',limit:-1}])
  assert.equal((await f.invoke(payload)).status,400);
});
test('notification derives identity and recipient from an owned message',async()=>{
 const f=fixture();const r=await f.invoke({message_id:'m1',sender_email:'carol@example.com',receiver_email:'carol@example.com',sender_name:'Fake'},messageNotification);
 assert.equal(r.status,200);const n=f.writes.find(w=>w[0]==='Notification')[2];assert.equal(n.actor_email,'alice@example.com');assert.equal(n.user_email,'bob@example.com');assert.equal(n.actor_name,'Alice');
 assert.equal((await f.invoke({message_id:'m3'},messageNotification)).status,403);
});
test('blocked and fabricated message/Whiff/status notifications are denied',async()=>{
 const f=fixture(block(true));
 assert.equal((await f.invoke({message_id:'m1'},messageNotification)).status,403);
 assert.equal((await f.invoke({from_email:'alice@example.com',to_email:'bob@example.com'},whiffNotification)).status,403);
 assert.equal((await f.invoke({post_id:'p1'},statusNotification)).status,403);
 assert.equal(f.writes.length,0);
 const g=fixture();g.database.Favorite.splice(0);
 assert.equal((await g.invoke({from_email:'alice@example.com',to_email:'bob@example.com'},whiffNotification)).status,403);
});
test('generic arbitrary push targets and other actors notifications are rejected',async()=>{
 const f=fixture();
 assert.equal((await f.invoke({user_email:'bob@example.com',title:'Fake'},push)).status,400);
 assert.equal((await f.invoke({notification_id:'n1'},push)).status,403);
});
test('source rules deny direct user access to each protected entity',async()=>{
 for(const name of ['ScentProfile','ChatMessage','Favorite','ProfileView','TypingIndicator','MessageReaction','StatusPost','Notification','BlockedUser']){
  const schema=JSON.parse(await readFile('base44/entities/'+name+'.jsonc','utf8'));
  for(const op of ['create','read','update','delete']) assert.deepEqual(schema.rls[op],{user_condition:{role:'admin'}});
 }
});

test('ordinary whiffs, views, typing and own notifications work through the gateway',async()=>{
 const f=fixture();
 for(const [entity,data] of [['Favorite',{to_email:'bob@example.com'}],['ProfileView',{viewed_email:'bob@example.com'}],['TypingIndicator',{conversation_partner:'bob@example.com'}]])
  assert.equal((await f.invoke({entity,action:'create',data})).status,200);
 f.database.Notification.push({id:'own-notification',user_email:'alice@example.com',actor_email:'bob@example.com',read:false});
 assert.equal((await f.invoke({entity:'Notification',action:'list',query:{user_email:'alice@example.com'}})).body.result.length,1);
 assert.equal((await f.invoke({entity:'Notification',action:'update',id:'own-notification',data:{read:true}})).status,200);
});
test('new profiles default to coarse storage and blocked lists remain private',async()=>{
 const f=fixture(block());
 const created=await f.invoke({entity:'ScentProfile',action:'create',data:{display_name:'Alice',age:25,location_lat:45.123456,location_lng:-123.123456}});
 assert.equal(created.status,200);assert.equal(created.body.result.fuzzy_location,true);assert.equal(created.body.result.location_lat,45.12);
 assert.equal((await f.invoke({entity:'BlockedUser',action:'list',query:{blocker_email:'bob@example.com'}})).body.result.length,0);
});

const { secureClient } = await import('../src/api/secureClient.js');
test('frontend routes protected reads and writes through the gateway with no raw fallback',async()=>{
 const calls=[];
 const raw=new Proxy({}, {get(){throw new Error('Raw access must not happen');}});
 const client=secureClient({entities:raw,functions:{async invoke(name,payload){calls.push({name,payload});return {data:{result:payload.action==='list'?[]:{id:'new'}}};}}});
 assert.deepEqual(await client.entities.ScentProfile.filter({user_email:'alice@example.com'}),[]);
 assert.equal((await client.entities.ChatMessage.create({content:'Hello',receiver_email:'bob@example.com'})).id,'new');
 assert.ok(calls.every(call=>call.name==='secureEntities'));
 assert.equal(calls[0].payload.entity,'ScentProfile');
});
test('frontend subscription drops an in-flight snapshot after account/session change',async()=>{
 const oldDocument=globalThis.document;
 globalThis.document={visibilityState:'visible',addEventListener(){},removeEventListener(){}};
 let resolveOld;
 let callCount=0;
 const client=secureClient({entities:{},functions:{async invoke(){
  callCount++;
  if(callCount===1) return new Promise(resolve=>{resolveOld=resolve;});
  return {data:{result:[{id:'new-account-record'}]}};
 }}});
 const firstEvents=[];const newEvents=[];
 const unsubscribeFirst=client.entities.ChatMessage.subscribe(e=>firstEvents.push(e));
 unsubscribeFirst();
 const unsubscribeNew=client.entities.ChatMessage.subscribe(e=>newEvents.push(e));
 resolveOld({data:{result:[{id:'old-account-private-record'}]}});
 await new Promise(resolve=>setTimeout(resolve,10));
 unsubscribeNew();globalThis.document=oldDocument;
 assert.ok(newEvents.length>0);assert.ok(newEvents.every(e=>e.id==='new-account-record'));
});

test('expired profile sessions reject rather than claiming the profile is missing', async () => {
 const { secureClient } = await import('../src/api/secureClient.js');
 const expired = Object.assign(new Error('Unauthorized'), { response: { status: 401 } });
 const client = secureClient({ entities: {}, functions: { invoke: async () => { throw expired; } } });
 await assert.rejects(client.entities.ScentProfile.filter({user_email:'alice@example.com'}), error => error === expired);
});
