import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const read=n=>fs.readFile(new URL(n,import.meta.url),'utf8');
test('HTTP conflict code and legacy serialization code both stop saves as conflicts',async()=>{
 const src=(await read('supabase-backend.js')).replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 for(const code of ['PT409','40001']){
  const c={document:{querySelector(){}},mockClient:{rpc:async()=>({error:{code,message:'STATE_CONFLICT'}})}};
  await vm.runInNewContext(`${src}\nclient=mockClient;globalThis.api=remoteApi;`,c);
  await assert.rejects(()=>c.api('state',{method:'PUT',body:JSON.stringify({revision:0,values:{}})}),e=>e.status===409&&e.code===code);
 }
});
test('revision request reads only the indexed account revision and never calls the state RPC',async()=>{
 const calls=[],query={select(v){calls.push(['select',v]);return this},eq(k,v){calls.push(['eq',k,v]);return this},async single(){return {data:{revision:12}}}};
 const c={document:{querySelector(){}},mockClient:{from(t){calls.push(['from',t]);return query},rpc(){throw Error('Full state RPC must not be called')}},calls};
 const src=(await read('supabase-backend.js')).replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 await vm.runInNewContext(`(async()=>{${src}\nclient=mockClient;account={id:'account-test'};globalThis.result=await remoteApi('revision');})()`,c);
 assert.equal(c.result.revision,12);assert.deepEqual(calls,[['from','bb_account_state'],['select','revision'],['eq','user_id','account-test']]);
});
test('settings artwork is in the initial header without waiting for account bootstrap',async()=>{
 const html=await read('index.html'),header=html.match(/<header>[\s\S]*?<\/header>/)[0];
 assert.match(header,/<button[^>]*id="open-settings"[^>]*aria-label="Impostazioni"[^>]*><img[^>]*src="menu-neon.png"/);
 assert.match(html,/<link rel="preload" as="image" href="menu-neon.png"/);
 assert.doesNotMatch(await read('interface.js'),/\$\('#open-settings'\)\.innerHTML=/);
});
test('background synchronization requests only revision, no more than once a minute, without overlap',async()=>{
 const nodes=new Map(),listeners={},intervals=[],calls=[];let release;
 const el=s=>{if(!nodes.has(s))nodes.set(s,{hidden:true,tagName:'BODY',textContent:''});return nodes.get(s)};
 const c={console,JSON,Object,document:{querySelector:el,activeElement:{tagName:'BODY'},hidden:false,addEventListener:(t,f)=>listeners[t]=f},window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},initializeAccount:async()=>({id:'test'}),migrateRecipeIds:v=>v,setInterval:(fn,ms)=>intervals.push({fn,ms}),setTimeout:()=>0,clearTimeout(){},remoteApi:async path=>{calls.push(path);if(path==='bootstrap')return{values:{},catalog:{},revision:1,user:'test'};return new Promise(r=>release=r)}};
 let src=(await read('storage.js')).replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 await vm.runInNewContext(`(async()=>{${src}\nawait initialize();globalThis.runPoll=poll;})()`,c);
 assert.equal(intervals[0].ms,60000);
 el('dialog[open]');c.document.querySelector=s=>s==='dialog[open]'?null:el(s);
 const first=c.runPoll();await c.runPoll();assert.deepEqual(calls,['bootstrap','revision']);
 release({revision:1});await first;
 c.document.hidden=true;await c.runPoll();assert.equal(calls.length,2);
 c.document.hidden=false;const second=c.runPoll();release({revision:1});await second;assert.equal(calls.length,3);
});
