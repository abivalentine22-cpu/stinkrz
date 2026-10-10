import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
let source = await readFile('base44/functions/sendPushNotification/entry.ts','utf8');
source = source.replace(/^import .*createClientFromRequest.*;\n/, 'const createClientFromRequest = () => globalThis.pushTestClient;\n');
source = source.replace(/async function getAccessToken[\s\S]*?\/\/ --- Handler ---/, 'async function getAccessToken() { return globalThis.pushMint(); }\n// --- Handler ---');
source = source.replace("Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')", "JSON.stringify({ project_id: 'mock' })");
source = source.replace('Deno.serve(async (req) => {','export const handler = async (req) => {').replace(/\}\);\s*$/, '};');
const {code} = await transform(source,{loader:'ts',format:'esm'});
const {handler} = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const request = () => new Request('https://mock.invalid',{method:'POST',body:JSON.stringify({notification_id:'n'})});
function setup() {
  const row={id:'n',actor_email:'sender',user_email:'recipient',title:'Hello',type:'new_message'};
  const tokens=[{id:'a',token:'token-a'},{id:'b',token:'token-b'}];
  const deleted=[];
  globalThis.pushMint=async()=> 'mock-access';
  globalThis.pushTestClient={auth:{me:async()=>({email:'sender'})},asServiceRole:{entities:{
    BlockedUser:{filter:async()=>[]},
    Notification:{
      filter:async()=>[{...row}],
      updateMany:async(query,patch)=>{
        if(query.push_completed && row.push_completed) return {success:true,updated:0};
        if(query.$or && row.push_claim_until>Date.now()) return {success:true,updated:0};
        if(query.push_claim_id && query.push_claim_id!==row.push_claim_id) return {success:true,updated:0};
        Object.assign(row,patch.$set); return {success:true,updated:1};
      },
    },
    PushToken:{filter:async()=>tokens.filter(t=>!deleted.includes(t.id)),delete:async id=>{deleted.push(id)}},
  }}};
  return {row,deleted};
}
test('overlapping pushes send each device once',async()=>{
  const state=setup(), oldFetch=globalThis.fetch, calls=[];
  globalThis.fetch=async(_,options)=>{calls.push(JSON.parse(options.body).message); await new Promise(resolve=>setTimeout(resolve,5));return new Response('{}',{status:200});};
  try {
    const responses=await Promise.all([handler(request()),handler(request())]);
    assert.ok(responses.every(r=>r.status===200));
    assert.equal(calls.length,2); assert.equal(state.row.push_completed,true);
    assert.ok(calls.every(m=>m.data.tag==='stinkrz-n'));
  } finally {globalThis.fetch=oldFetch;}
});
test('partial delivery retries only the failed device and retains tokens on provider errors',async()=>{
  const state=setup(),oldFetch=globalThis.fetch,calls=[];let fail=true;
  globalThis.fetch=async(_,options)=>{
    const token=JSON.parse(options.body).message.token;calls.push(token);
    return new Response(JSON.stringify({error:{status:'NOT_FOUND'}}),{status:token==='token-b'&&fail?404:200});
  };
  try{
    assert.equal((await handler(request())).status,503);
    assert.equal(state.row.push_completed,false);assert.deepEqual(state.deleted,[]);
    fail=false;
    assert.equal((await handler(request())).status,200);
    assert.deepEqual(calls,['token-a','token-b','token-b']);
    assert.equal(state.row.push_completed,true);
  }finally{globalThis.fetch=oldFetch;}
});
test('OAuth failure leaves delivery retryable without claiming completion',async()=>{
  const state=setup();globalThis.pushMint=async()=>{throw new Error('secret-provider-detail')};
  const response=await handler(request());
  assert.equal(response.status,500);assert.equal(state.row.push_attempted,undefined);
  assert.equal((await response.text()).includes('secret-provider-detail'),false);
});
test('expired push lease resumes remaining devices after a crashed run',async()=>{
  const state=setup(),oldFetch=globalThis.fetch,calls=[];
  Object.assign(state.row,{push_state:'sending',push_claim_until:Date.now()-1,push_delivered_token_ids:['a']});
  globalThis.fetch=async(_,options)=>{calls.push(JSON.parse(options.body).message.token);return new Response('{}',{status:200})};
  try{assert.equal((await handler(request())).status,200);assert.deepEqual(calls,['token-b']);}
  finally{globalThis.fetch=oldFetch;}
});
