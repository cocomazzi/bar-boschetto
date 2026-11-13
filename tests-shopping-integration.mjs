import * as recipeIds from './recipe-ids.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
import * as shoppingModel from './shopping-model.js';
import {preserveNutritionSettings} from './recipe-nutrition-model.js';
const db=JSON.parse(await fs.readFile(new URL('./data.json',import.meta.url)));
const src=(await fs.readFile(new URL('./app.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replaceAll('export function','function');
async function run(values,scenario,mobile=false){
 const nodes=new Map(),listeners=new Map();function el(s){if(!nodes.has(s))nodes.set(s,{value:'',innerHTML:'',textContent:'',dataset:{},children:[],checked:false,disabled:false,hidden:false,open:false,addEventListener(type,fn){listeners.set(s+':'+type,fn)},querySelectorAll(){return[]},getBoundingClientRect(){return {height:0}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},focus(){},showModal(){this.open=true},close(){this.open=false},checkValidity(){return true},reportValidity(){return true},setCustomValidity(){}});return nodes.get(s)}
 const c={...recipeIds,...shoppingModel,assert,values,console,Intl,JSON,Object,Map,Set,crypto:webcrypto,window:{matchMedia:()=>({matches:mobile})},navigator:{clipboard:{}},document:{body:{dataset:{}},querySelector:el,createElement:()=>el('new'),documentElement:{style:{setProperty(){}}},addEventListener(){},activeElement:{tagName:'BODY'}},setTimeout:()=>0,clearTimeout(){},appStorage:{getItem:k=>values[k]??null,setItem:(k,v)=>{if(c.failShopping&&k==='boschetto-shopping-v1')throw Error('Simulated save failure');values[k]=k==='boschetto-v1'?JSON.stringify(preserveNutritionSettings(JSON.parse(values[k]||'{}'),JSON.parse(v))):v;},catalog:async()=>db}};
 await vm.runInNewContext(`(async()=>{${src}\n${scenario}\n})()`,c);return c;
}
test('real calendar occurrences add/subtract only their demand; manual product and purchase/store survive reload',async()=>{
 const values={'boschetto-v1':JSON.stringify({manualItems:[{ingredient_id:'I001',ingredient_name:'pasta',quantity:'50',unit:'g'}],nutritionSettings:{defaultFirstPercent:55,recipeFirstPercent:{R001:60}}})};
 await run(values,`
 const day=dateKey(weekDates()[0]),row=()=>shoppingRows(shoppingState,shoppingSources()).find(r=>r.key==='I001');
 assert.equal(row().quantities[0].sum,50);assert.equal(assignDay(day,'R001'),true);assert.equal(assignDay(day,'R001'),true);assert.equal(row().quantities[0].sum,370);
 $('#shopping-list').onchange({target:{dataset:{shopCheck:'I001'},checked:true}});assert.equal(row().checked,true);
 assignDay(day,'R001');assert.equal(row().checked,true);assert.equal(row().quantities[0].sum,530);
 const remove=id=>$('#week-days').onclick({target:{closest:s=>s==='[data-remove-day]'?{dataset:{removeDay:day,removeEntry:id}}:null}});
 remove(weekPlan[day][0].id);assert.equal(row().quantities[0].sum,370);remove(weekPlan[day][0].id);remove(weekPlan[day][0].id);assert.equal(row().quantities[0].sum,50);assert.equal(manualItems.length,1);assert.equal(row().checked,true);
 $('#shopping-list').onchange({target:{dataset:{shopStore:'I001'},value:'store-2'}});assert.equal(row().storeId,'store-2');assert.equal(row().checked,true);
 assert.equal(JSON.parse(values['boschetto-v1']).nutritionSettings.recipeFirstPercent.R001,60);
 `);
 await run(values,`const row=()=>shoppingRows(shoppingState,shoppingSources()).find(r=>r.key==='I001');assert.equal(row().checked,true);assert.equal(row().storeId,'store-2');$('#shopping-list').onchange({target:{dataset:{shopCheck:'I001'},checked:false}});assert.equal(row().checked,false);assert.equal(row().quantities[0].sum,50);`);
});
test('manual recurring entries deduplicate, remain purchased when quantities increase and keep habitual store',async()=>{
 const values={};await run(values,`
 const add=(name,q,store)=>{$('#manual-name').value=name;$('#manual-quantity').value=q;$('#manual-unit').value='g';$('#manual-store').value=store;$('#manual-form').onsubmit({preventDefault(){},target:{reportValidity:()=>true}})};
 add('pasta','20','store-2');$('#shopping-list').onchange({target:{dataset:{shopCheck:'I001'},checked:true}});add('pasta','30','store-2');
 const rows=shoppingRows(shoppingState,shoppingSources());assert.equal(rows.length,1);assert.equal(rows[0].checked,true);assert.equal(rows[0].quantities[0].sum,50);assert.equal(rows[0].storeId,'store-2');assert.equal(manualItems.length,2);
 $('#manual-name').value='pasta';knownManualProduct('pasta');assert.equal(storeFor(shoppingState,'I001'),'store-2');
 `);await run(values,`const row=shoppingRows(shoppingState,shoppingSources())[0];assert.equal(row.checked,true);assert.equal(row.quantities[0].sum,50);assert.equal(row.storeId,'store-2');`);
});
test('bulk action marks only current supermarket, retains manual entries and exports pending items only',async()=>{
 const values={'boschetto-v1':JSON.stringify({manualItems:[{ingredient_id:'I001',ingredient_name:'pasta',quantity:'50',unit:'g'},{ingredient_id:'I002',ingredient_name:'zucchine',quantity:'100',unit:'g'}]})};
 await run(values,`commitShopping(moveProduct(shoppingState,'I002','store-2'));shoppingState.activeStoreId='store-1';$('#clear').onclick();const rows=shoppingRows(shoppingState,shoppingSources());assert.equal(rows.find(r=>r.key==='I001').checked,true);assert.equal(rows.find(r=>r.key==='I002').checked,false);assert.equal(manualItems.length,2);shoppingState.activeStoreId='store-2';renderShopping();assert.equal(window.shoppingText.includes('zucchine: 100 g'),true);assert.equal(window.shoppingText.includes('pasta'),false);`);
});
test('store settings default routes new ingredients while known preferences stay, save failure retains checkbox',async()=>{
 const values={};await run(values,`$('#store-name-1').value='AH';$('#store-name-2').value='Lidl';$('#shopping-default-store').value='store-2';$('#shopping-store-form').onsubmit({preventDefault(){}});assignDay(dateKey(weekDates()[0]),'R001');assert.equal(storeFor(shoppingState,'I001'),'store-2');globalThis.failShopping=true;const target={dataset:{shopCheck:'I001'},checked:true};$('#shopping-list').onchange({target});assert.equal(shoppingState.products.I001.checked,false);assert.equal(target.checked,false);assert.equal($('#shopping-message').textContent,'Simulated save failure');`);
});
test('moving a calendar occurrence preserves identity and demand instead of duplicating it',async()=>{await run({},`const day=dateKey(weekDates()[0]),other=dateKey(weekDates()[1]);assignDay(day,'R001');const id=weekPlan[day][0].id;const before=shoppingRows(shoppingState,shoppingSources()).find(r=>r.key==='I001').quantities[0].sum;movePlanned(day,id,other);assert.equal(weekPlan[day],undefined);assert.equal(weekPlan[other].length,1);assert.equal(weekPlan[other][0].id,id);assert.equal(shoppingRows(shoppingState,shoppingSources()).find(r=>r.key==='I001').quantities[0].sum,before);`);});

test('calendar page exposes 28 days and recipe view hides calendar',async()=>{await run({},`showPage('calendar');assert.equal(weekDates().length,28);assert.equal($('#ricettario').hidden,true);showPage('recipes');assert.equal($('#calendario').hidden,true);showPage('categories');assert.equal(weekDates().length,7);assert.equal(categoryOpen.size,0);`);});
test('calendar plus picker submits recipe and immediately creates pending shopping demands',async()=>{await run({},`const day=dateKey(weekDates()[0]);$('#week-days').onclick({target:{closest:s=>s==='[data-pick-day]'?{dataset:{pickDay:day}}:null}});$('#calendar-recipe').value='R001';$('#calendar-form').onsubmit({preventDefault(){}});assert.equal(weekPlan[day][0].recipeId,'R001');const rows=shoppingRows(shoppingState,shoppingSources());assert.equal(rows.find(r=>r.key==='I001').quantities[0].sum,160);assert.equal(rows.find(r=>r.key==='I001').checked,false);assert.equal(rows.length,5);`);});


test('mobile menu keeps seven vertical-day destinations, preserves recipe search and moves across weeks without duplicate demand',async()=>{await run({},`
 showPage('calendar');assert.equal(weekDates().length,7);
 const day=mobileMenuDates()[0].key;assignDay(day,'R001');const id=weekPlan[day][0].id;
 assert.equal(mobileMenuDates()[0].count,1);
 const before=JSON.stringify(shoppingRows(shoppingState,shoppingSources()).map(r=>r.quantities));
 $('#next-week').onclick();const next=mobileMenuDates()[0].key;
 assert.notEqual(next,day);assert.equal(movePlanned(day,id,next),true);
 assert.equal(weekPlan[day],undefined);assert.equal(weekPlan[next][0].id,id);
 assert.equal(JSON.stringify(shoppingRows(shoppingState,shoppingSources()).map(r=>r.quantities)),before);
 $('#search').value='zucchine';activeTags.add('Vegetariano');showPage('categories',true);
 assert.equal($('#search').value,'zucchine');assert.equal(activeTags.has('Vegetariano'),true);
 assert.match($('#recipes').innerHTML,/data-add-menu/);
 showPage('recipes',true);assert.equal($('#recipes').innerHTML.includes('recipe-table'),false);
 `,true);});
