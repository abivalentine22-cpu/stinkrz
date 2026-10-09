import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const source=(await readFile('base44/functions/support-stats/entry.ts','utf8')).replace('Deno.serve(req=>handleRequest(req));','');
const {code}=await transform(source,{loader:'ts',format:'esm'});
const {collectTotal,monthRange,handleRequest}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const range=monthRange(new Date('2026-10-09T20:00:00Z'));
const charge={id:'c1',amount_captured:1000,amount_refunded:200,currency:'usd',livemode:true,paid:true,disputed:false};
const session={id:'s1',created:range.start+1,payment_link:'plink_support',livemode:true,payment_status:'paid',currency:'usd',mode:'payment',payment_intent:{latest_charge:charge}};
const link={id:'plink_support',livemode:true,url:'https://buy.stripe.com/aFa7sMdjY7Cddfue6qbwk00'};
test('calendar boundary follows Pacific time including daylight saving',()=>{
 assert.equal(new Date(range.start*1000).toISOString(),'2026-10-01T07:00:00.000Z');
 assert.equal(new Date(monthRange(new Date('2026-12-09')).start*1000).toISOString(),'2026-12-01T08:00:00.000Z');
 assert.equal(monthRange(new Date('2026-10-01T06:59:00Z')).label,'September 2026');
});
test('total ignores unpaid, test, other-link, duplicate and disputed payments and subtracts refunds',async()=>{
 const rows=[session,session,{...session,payment_status:'unpaid'},{...session,livemode:false},{...session,payment_link:'other'},{...session,payment_intent:{latest_charge:{...charge,id:'c2',disputed:true}}}];
 const api=async(path,params)=>{if(path==='/payment_links')return {data:[link]};assert.equal(params.payment_link,'plink_support');return {data:rows}};
 assert.equal((await collectTotal(api,range)).raised_cents,800);
});
test('pagination includes every page and only returns aggregate data',async()=>{
 let pages=0;
 const api=async(path,params)=>{if(path==='/payment_links')return {data:[link]};pages++;return params.starting_after?{data:[{...session,id:'s2',payment_intent:{latest_charge:{...charge,id:'c2'}}}]}:{data:[session],has_more:true}};
 const response=await handleRequest(new Request('https://test.invalid'),{key:'rk_live_test',now:new Date('2026-10-09'),api});
 const body=await response.json();
 assert.equal(body.raised_cents,1600);assert.equal(pages,2);
 assert.ok(!JSON.stringify(body).includes('plink_support'));
 assert.ok(!JSON.stringify(body).includes('payment_intent'));
});
test('missing/test keys and failed Stripe requests never display fake zero',async()=>{
 for(const key of ['', 'rk_test_test']){
  const response=await handleRequest(new Request('https://test.invalid'),{key});
  assert.deepEqual(await response.json(),{available:false});
 }
 const response=await handleRequest(new Request('https://test.invalid'),{key:'rk_live_test',api:async()=>{throw new Error('sensitive detail')}});
 assert.deepEqual(await response.json(),{available:false});
});
