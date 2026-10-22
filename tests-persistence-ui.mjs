import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as model from './recipe-nutrition-model.js';
const db=JSON.parse(await fs.readFile(new URL('./data.json',import.meta.url)));
function dom(){const nodes=new Map(),listeners=new Map();function el(s){if(!nodes.has(s))nodes.set(s,{value:'',innerHTML:'',textContent:'',dataset:{},children:[],checked:false,disabled:false,hidden:false,open:false,addEventListener(type,fn){listeners.set(s+':'+type,fn)},querySelectorAll(){return[]},getBoundingClientRect(){return {height:0}},classList:{toggle(){}},setAttribute(){},focus(){},showModal(){this.open=true},close(){this.open=false},checkValidity(){return true},reportValidity(){return true},setCustomValidity(){}});return nodes.get(s)};return {el,listeners,document:{querySelector:el,createElement:()=>el('dialog'),documentElement:{style:{setProperty(){}}},body:{append(){}},addEventListener(type,fn){listeners.set('document:'+type,fn)},activeElement:{tagName:'BODY'}}};}
test('actual storage retains settings on cookbook saves and protects settings-only state from import',async()=>{
 const d=dom(),remote={revision:1,values:{'boschetto-v1':JSON.stringify({nutritionSettings:{defaultFirstPercent:65,recipeFirstPercent:{R001:70}}})}};
 const c={...d,console,JSON,Object,preserveNutritionSettings:model.preserveNutritionSettings,initializeAccount:async()=>({id:'test'}),remoteApi:async()=>({...remote,catalog:db,user:'test'}),openLogin(){},logout(){},localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,window:{addEventListener(){}},fetch:async()=>({json:async()=>db})};
 let src=await fs.readFile(new URL('./storage.js',import.meta.url),'utf8');src=src.replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 await vm.runInNewContext(`(async()=>{${src}\nawait initialize();finishInitialization();appStorage.setItem('boschetto-v1',JSON.stringify({selected:['R001']}));globalThis.result=JSON.parse(appStorage.getItem('boschetto-v1'));globalThis.onlySettings=hasData({'boschetto-v1':JSON.stringify({nutritionSettings:{defaultFirstPercent:55}})});})()`,c);
 assert.equal(c.result.nutritionSettings.defaultFirstPercent,65);assert.equal(c.result.nutritionSettings.recipeFirstPercent.R001,70);assert.equal(c.result.selected[0],'R001');assert.ok(c.onlySettings);
});
test('recipe dialog previews, saves and reloads global/recipe ratios without touching other state',async()=>{
 const d=dom(),base={selected:['R001'],amounts:{'R001:0':'200'},manualItems:[{ingredient_id:'x'}]},values={'boschetto-v1':JSON.stringify(base)};
 const recipe={...db.ricette[0],ingredients:db.ricette_ingredienti.filter(i=>i.recipe_id==='R001')};
 const c={...d,...model,console,JSON,Object,Intl,structuredClone,appStorage:{getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=v},catalog:async()=>db},getRecipeForNutrition:()=>recipe};
 let src=await fs.readFile(new URL('./recipe-nutrition.js',import.meta.url),'utf8');src=src.replace(/^import .*;\r?\n/gm,'');
 await vm.runInNewContext(`(async()=>{${src}\nawait open('R001');globalThis.initial=$('#recipe-nutrition-results').innerHTML;$('#nutrition-default-share').value='60';$('#nutrition-override-share').checked=true;$('#nutrition-recipe-share').value='70';display();$('#recipe-nutrition-form').onsubmit({preventDefault(){},target:{reportValidity:()=>true}});await open('R001');globalThis.defaultPercent=$('#nutrition-default-share').value;globalThis.recipePercent=$('#nutrition-recipe-share').value;globalThis.hasOverride=$('#nutrition-override-share').checked;})()`,c);
 assert.match(c.initial,/55%/);assert.match(c.initial,/45%/);const saved=JSON.parse(values['boschetto-v1']);assert.equal(saved.nutritionSettings.defaultFirstPercent,60);assert.equal(saved.nutritionSettings.recipeFirstPercent.R001,70);assert.deepEqual(saved.selected,base.selected);assert.deepEqual(saved.amounts,base.amounts);assert.deepEqual(saved.manualItems,base.manualItems);assert.equal(c.defaultPercent,60);assert.equal(c.recipePercent,70);assert.equal(c.hasOverride,true);
});
test('shopping keeps full ingredient quantities; displayed recipe resolver never selects or mutates',async()=>{
 const src=await fs.readFile(new URL('./app.js',import.meta.url),'utf8');
 const d=dom(),values={'boschetto-v1':JSON.stringify({nutritionSettings:{defaultFirstPercent:75}})};
 const c={...d,console,Intl,JSON,Object,Map,Set,window:{},navigator:{clipboard:{}},appStorage:{getItem:k=>values[k]??null,setItem:(k,v)=>{const previous=JSON.parse(values[k]||'{}');values[k]=k==='boschetto-v1'?JSON.stringify(model.preserveNutritionSettings(previous,JSON.parse(v))):v},catalog:async()=>db},setTimeout:()=>0,clearTimeout(){}};
 const code=src.replace(/^import .*;\r?\n/gm,'').replace('export function getRecipeForNutrition','function getRecipeForNutrition');
 await vm.runInNewContext(`(async()=>{${code}\nconst r=recipes[0];individual.add(lineKey(r,0));render();const before=window.shoppingText;const view=getRecipeForNutrition(r.recipe_id);globalThis.shoppingBefore=before;globalThis.view=view;globalThis.unchanged=before===window.shoppingText;amounts[lineKey(r,0)]='250';units[lineKey(r,0)]='g';globalThis.effective=getRecipeForNutrition(r.recipe_id).ingredients[0].quantity;persist();})()`,c);
 assert.equal(c.unchanged,true);assert.match(c.shoppingBefore,/pasta: 160 g/);assert.equal(c.effective,'250');assert.equal(JSON.parse(values['boschetto-v1']).nutritionSettings.defaultFirstPercent,75);
});
