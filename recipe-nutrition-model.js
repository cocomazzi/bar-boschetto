export const NUTRIENTS=['kcal','protein','carbs','fat'];
const COLUMNS={kcal:'kcal_100g',protein:'protein_g_100g',carbs:'carbs_g_100g',fat:'fat_g_100g'};
export function number(value){
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(typeof value!=='string'||!value.trim())return null;
 const text=value.trim().replace(',','.');
 if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)){const n=Number(text);return Number.isFinite(n)?n:null;}
 const fraction=text.match(/^(\d+)\s*\/\s*(\d+)$/);return fraction&&Number(fraction[2])>0?Number(fraction[1])/Number(fraction[2]):null;
}
export function validPercent(value){const n=number(value);return n!==null&&n>=0&&n<=100;}
export function normalizedSettings(raw={}){
 const safe=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 return {...safe,version:1,defaultFirstPercent:validPercent(safe.defaultFirstPercent)?number(safe.defaultFirstPercent):55,recipeFirstPercent:{...(safe.recipeFirstPercent||{})},gramsPerUnit:{...(safe.gramsPerUnit||{})}};
}
export function firstPercent(settings,id){const s=normalizedSettings(settings);const v=s.recipeFirstPercent[id];return validPercent(v)?number(v):s.defaultFirstPercent;}
// Existing cookbook writers do not know this additive property. Retain it on
// every cookbook save, including recipe edits, shopping changes and imports.
export function preserveNutritionSettings(previous,incoming){
 if(!Object.hasOwn(incoming,'nutritionSettings')&&Object.hasOwn(previous,'nutritionSettings'))return {...incoming,nutritionSettings:previous.nutritionSettings};
 return incoming;
}
export function unitInfo(raw){
 const u=String(raw??'').trim().toLowerCase().replace(/\.$/,'');
 if(['g','gr','grammo','grammi','gram','grams'].includes(u))return {unit:'g',mass:1};
 if(['kg','chilogrammo','chilogrammi','kilogram','kilograms'].includes(u))return {unit:'g',mass:1000};
 if(u==='hg')return {unit:'g',mass:100};if(u==='mg')return {unit:'g',mass:0.001};
 if(['ml','millilitro','millilitri'].includes(u))return {unit:'ml',scale:1};
 if(['l','litro','litri'].includes(u))return {unit:'ml',scale:1000};if(u==='cl')return {unit:'ml',scale:10};if(u==='dl')return {unit:'ml',scale:100};
 if(['pz','pezzo','pezzi','p','piece','pieces'].includes(u))return {unit:'pz',scale:1};
 if(['porzione','porzioni'].includes(u))return {unit:'porzione',scale:1};
 if(['spicchio','spicchi'].includes(u))return {unit:'spicchio',scale:1};
 if(['confezione','confezioni'].includes(u))return {unit:'confezione',scale:1};
 return {unit:u,scale:1};
}
export function gramsFor(line,settings,manualRecord){
 const quantity=number(line.quantity),info=unitInfo(line.unit);
 if(quantity===null||quantity<0)return {grams:null,issue:'quantity',...info};
 if(quantity===0)return {grams:0,...info};
 if(info.mass)return {grams:quantity*info.mass,...info};
 let factor=number(settings?.gramsPerUnit?.[line.ingredient_id]?.[info.unit]);
 if(!(factor>0)&&info.unit==='porzione')factor=number(manualRecord?.portion_grams);
 if(!info.unit||!(factor>0))return {grams:null,issue:'conversion',quantity,...info};
 const grams=quantity*(info.scale||1)*factor;
 return Number.isFinite(grams)?{grams,factor,...info}:{grams:null,issue:'conversion',quantity,...info};
}
export function per100g(item,records={}){
 if(Object.hasOwn(records,item.ingredient_id))return records[item.ingredient_id]?.values?.['100g']||{};
 return Object.fromEntries(NUTRIENTS.map(f=>[f,item[COLUMNS[f]]??null]));
}
export function calculateRecipe(recipe,catalog,records={},settings={}){
 const byId=new Map(catalog.map(i=>[i.ingredient_id,i]));
 const rows=(recipe.ingredients||[]).map((line,index)=>{
  const conversion=gramsFor(line,settings,records[line.ingredient_id]);
  const source=per100g(byId.get(line.ingredient_id)||{ingredient_id:line.ingredient_id},records);
  const values=Object.fromEntries(NUTRIENTS.map(f=>{
   const n=number(source[f]);const contribution=conversion.grams===0?0:conversion.grams!==null&&n!==null&&n>=0?conversion.grams*n/100:null;
   return [f,Number.isFinite(contribution)?contribution:null];
  }));
  return {line,index,...conversion,values,missing:NUTRIENTS.filter(f=>values[f]===null)};
 });
 const share=firstPercent(settings,recipe.recipe_id)/100;
 const totals=Object.fromEntries(NUTRIENTS.map(f=>{
  const known=rows.filter(r=>r.values[f]!==null);const sum=known.reduce((n,r)=>n+r.values[f],0);
  const complete=rows.length>0&&known.length===rows.length&&Number.isFinite(sum);
  const subtotal=known.length&&Number.isFinite(sum)?sum:null;
  return [f,{complete,total:complete?sum:null,subtotal,first:complete?sum*share:null,second:complete?sum*(1-share):null,firstSubtotal:subtotal===null?null:subtotal*share,secondSubtotal:subtotal===null?null:subtotal*(1-share),missingRows:rows.filter(r=>r.values[f]===null).map(r=>r.index)}];
 }));
 return {rows,totals,firstPercent:share*100,secondPercent:(1-share)*100,complete:NUTRIENTS.every(f=>totals[f].complete)};
}
