import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const original=await readFile('src/lib/authMfaFlow.js','utf8');
let instance=0;
async function fixture() {
 const requests=[],tokens=[],redirects=[];
 const replies=[];
 const base44={auth:{setToken:value=>tokens.push(value),loginWithProvider:(...args)=>redirects.push(args)}};
 const params={appId:'69faa8a3ff7324c96aef6556'};
 const source=original.replace("import { base44 } from '@/api/base44Client';",'const base44=globalThis.mfaFixture.base44;').replace("import { appParams } from '@/lib/app-params';",'const appParams=globalThis.mfaFixture.params;');
 globalThis.mfaFixture={base44,params};
 const module=await import('data:text/javascript;base64,'+Buffer.from(source+'\n// '+instance++).toString('base64'));
 const previous={fetch:globalThis.fetch,window:globalThis.window,sessionStorage:globalThis.sessionStorage};
 globalThis.fetch=async(url,options)=>{requests.push({url,options});return replies.shift()||Response.json({});};
 globalThis.window={location:{origin:'https://stinkrz.com',pathname:'/mfa',search:'',assign:url=>redirects.push(url)},history:{replaceState(){}}};
 const storage=new Map();globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 return {...module,requests,replies,tokens,redirects,storage,restore(){Object.assign(globalThis,previous);delete globalThis.mfaFixture;}};
}
test('verification uses the current grant and persists rotated access tokens',async()=>{
 const f=await fixture();try{
  f.replies.push(Response.json({mfa_management_token:'rotated',access_token:'access'}),Response.json({methods:['totp']}));
  const session=f.mfaSession({mfa_session_token:'challenge'});
  await session.verify('123456','totp',true);await session.status();
  assert.equal(f.requests[0].options.headers.Authorization,'Bearer challenge');
  assert.deepEqual(JSON.parse(f.requests[0].options.body),{code:'123456',method:'totp',remember_device:true});
  assert.equal(f.requests[1].options.headers.Authorization,'Bearer rotated');
  assert.equal(f.requests[1].options.method,'GET');assert.equal(f.requests[1].options.body,undefined);
  assert.deepEqual(f.tokens,['access']);
 }finally{f.restore();}
});
test('verification errors preserve retry information and do not issue an access token',async()=>{
 const f=await fixture();try{
  f.replies.push(Response.json({error:{message:'Try later'}},{status:429,headers:{'Retry-After':'30'}}));
  await assert.rejects(f.mfaSession({mfa_session_token:'challenge'}).verify('123456','sms',false),error=>error.status===429&&error.retryAfter===30&&!error.mustSignInAgain);
  assert.deepEqual(f.tokens,[]);
 }finally{f.restore();}
});
test('password management request keeps credentials in the request body',async()=>{
 const f=await fixture();try{
  await f.signInToManageMfa('user@example.com','example-password');
  assert.equal(f.requests[0].url,'/api/apps/69faa8a3ff7324c96aef6556/auth/login');
  assert.deepEqual(JSON.parse(f.requests[0].options.body),{email:'user@example.com',password:'example-password'});
  assert.equal(f.requests[0].options.headers['X-App-Mfa-Action'],'manage');
 }finally{f.restore();}
});
test('ordinary Google login still uses the existing provider flow',async()=>{
 const f=await fixture();try{
  f.replies.push(Response.json({auth_config:{mfa_policy:'optional'}}));
  await f.signInWithProvider('google','/scent-block');
  assert.deepEqual(f.redirects,[['google','/scent-block']]);
 }finally{f.restore();}
});
test('MFA exchange is performed once and removes the one-time code from the URL',async()=>{
 const f=await fixture();try{
  window.location.search='?mfa_code=once&returnTo=%2Fscent-block';
  let replaced;window.history.replaceState=(_a,_b,url)=>{replaced=url;};
  f.storage.set('app-mfa-pkce:69faa8a3ff7324c96aef6556','verifier');
  f.replies.push(Response.json({mfa_required:true}));
  await Promise.all([f.resumeMfa(),f.resumeMfa()]);
  assert.equal(f.requests.length,1);
  assert.deepEqual(JSON.parse(f.requests[0].options.body),{code:'once',code_verifier:'verifier'});
  assert.equal(replaced.includes('mfa_code'),false);assert.equal(f.storage.size,0);
 }finally{f.restore();}
});
