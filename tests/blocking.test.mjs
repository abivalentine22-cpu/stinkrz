import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
let source=await readFile('src/hooks/useBlockedUsers.js','utf8');
source=source.replace(/^import .*;\n/gm,'');
source='const {useState,useEffect,useCallback,useRef,base44,useAuth,useToast}=globalThis.blockHarness;\n'+source;
const {code}=await transform(source,{loader:'js',format:'esm'});
let sequence=0;
async function fixture(initial=[]) {
 const cells=[];let cursor=0;let mounted=false;const cleanups=[];const effects=[];const toasts=[];
 const rows=initial.map((email,i)=>({id:String(i),blocker_email:'me',blocked_email:email}));
 let listener;let creates=0;
 const entity={
  list:async()=>rows.map(r=>({...r})),
  subscribe:fn=>{listener=fn;return()=>{};},
  create:async data=>{creates++;const row={id:'new',...data};rows.push(row);return row;},
  filter:async query=>rows.filter(row=>Object.entries(query).every(([k,v])=>row[k]===v)),
  delete:async id=>{rows.splice(rows.findIndex(row=>row.id===id),1);},
 };
 globalThis.blockHarness={
  useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],update=>{cells[i]=typeof update==='function'?update(cells[i]):update;}];},
  useRef(initial){const i=cursor++;if(!(i in cells))cells[i]={current:initial};return cells[i];},
  useEffect(fn){if(!mounted)effects.push(fn);},useCallback:fn=>fn,
  base44:{entities:{BlockedUser:entity}},useAuth:()=>({user:{email:'me'}}),useToast:()=>({toast:value=>toasts.push(value)}),
 };
 const {useBlockedUsers}=await import('data:text/javascript;base64,'+Buffer.from(code+'\n// instance '+sequence++).toString('base64'));
 const render=()=>{cursor=0;const value=useBlockedUsers();if(!mounted){mounted=true;for(const effect of effects)cleanups.push(effect());}return value;};
 render();await new Promise(r=>setTimeout(r,0));
 return {render,entity,rows,toasts,emit:event=>listener(event),get creates(){return creates;},close:()=>cleanups.forEach(fn=>fn?.())};
}
test('failed block preserves status and shows an error',async()=>{
 const f=await fixture();try{
  f.entity.create=async()=>{throw new Error('offline');};
  assert.equal(await f.render().blockUser('bob'),false);
  assert.equal(f.render().isBlocked('bob'),false);
  assert.equal(f.toasts[0]?.variant,'destructive');
 }finally{f.close();}
});
test('block status changes only after save and duplicate clicks are suppressed',async()=>{
 const f=await fixture();let release;const gate=new Promise(r=>release=r);const create=f.entity.create;
 try{
  f.entity.create=async data=>{await gate;return create(data);};
  const save=f.render().blockUser('bob');
  assert.equal(f.render().isBlocked('bob'),false);
  assert.equal(await f.render().blockUser('bob'),false);
  release();assert.equal(await save,true);
  assert.equal(f.render().isBlocked('bob'),true);assert.equal(f.creates,1);
 }finally{f.close();}
});
test('failed unblock stays blocked even if some duplicate deletes succeeded',async()=>{
 const f=await fixture(['bob','bob']);try{
  f.entity.delete=async id=>{
   if(id==='1')throw new Error('offline');
   const row=f.rows.find(row=>row.id===id);f.rows.splice(f.rows.indexOf(row),1);
   f.emit({type:'delete',id,data:row});
  };
  assert.equal(await f.render().unblockUser('bob'),false);
  assert.equal(f.render().isBlocked('bob'),true);
  assert.equal(f.toasts[0]?.title,"Couldn't unblock this person");
 }finally{f.close();}
});
test('successful unblock removes duplicate records and confirmed status',async()=>{
 const f=await fixture(['bob','bob','carol']);try{
  assert.equal(await f.render().unblockUser('bob'),true);
  assert.equal(f.render().isBlocked('bob'),false);
  assert.equal(f.render().isBlocked('carol'),true);
  assert.equal(f.rows.length,1);
 }finally{f.close();}
});
test('failed block can be retried successfully',async()=>{
 const f=await fixture();const create=f.entity.create;try{
  f.entity.create=async()=>{throw new Error('offline');};
  assert.equal(await f.render().blockUser('bob'),false);
  f.entity.create=create;
  assert.equal(await f.render().blockUser('bob'),true);
  assert.equal(f.render().isBlocked('bob'),true);
 }finally{f.close();}
});
