import {HttpError} from './http.js';
export const STATE_KEYS=['boschetto-v1','boschetto-calendar-v1','boschetto-shopping-v1','boschetto-nutrition-v1'];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
function recipe(value){if(!object(value)||!id(value.recipe_id)||typeof value.name!=='string'||!value.name.trim()||value.name.length>180||typeof value.category!=='string'||value.category.length>70||!Array.isArray(value.tags)||value.tags.some(t=>typeof t!=='string'||t.length>100)||!Array.isArray(value.ingredients)||value.ingredients.length>300||String(value.cooking_notes||'').length>10000)throw new HttpError(400,'INVALID_RECIPE');for(const i of value.ingredients)if(!object(i)||!id(i.ingredient_id)||typeof i.ingredient_name!=='string'||i.ingredient_name.length>150||String(i.unit||'').length>20||String(i.quantity??'').length>40||Number(String(i.quantity).replace(',','.'))<0)throw new HttpError(400,'INVALID_INGREDIENT')}
export function validateState(values){
 if(!object(values)||Object.keys(values).some(k=>!STATE_KEYS.includes(k)))throw new HttpError(400,'INVALID_STATE');
 for(const [key,encoded] of Object.entries(values)){
  if(typeof encoded!=='string')throw new HttpError(400,'INVALID_STATE');let value;try{value=JSON.parse(encoded)}catch{throw new HttpError(400,'INVALID_JSON')}
  if(!object(value))throw new HttpError(400,'INVALID_STATE');
  if(key==='boschetto-v1'){
   for(const field of ['individual','selected','checked'])if(value[field]!==undefined&&(!Array.isArray(value[field])||value[field].some(x=>typeof x!=='string'||x.length>300)))throw new HttpError(400,'INVALID_SELECTION');
   if(value.customRecipes!==undefined&&!Array.isArray(value.customRecipes))throw new HttpError(400,'INVALID_RECIPE');
   for(const r of value.customRecipes||[])recipe(r);
   if(value.editedRecipes!==undefined&&!object(value.editedRecipes))throw new HttpError(400,'INVALID_RECIPE');
   for(const [key,r] of Object.entries(value.editedRecipes||{})){recipe(r);if(key!==r.recipe_id)throw new HttpError(400,'INVALID_RECIPE')}
   for(const field of ['amounts','units','recipeTags'])if(value[field]!==undefined&&!object(value[field]))throw new HttpError(400,'INVALID_STATE');
   for(const tags of Object.values(value.recipeTags||{}))if(!Array.isArray(tags)||tags.some(t=>typeof t!=='string'||t.length>100))throw new HttpError(400,'INVALID_TAG');
   for(const [field,limit] of [['amounts',40],['units',20]])for(const v of Object.values(value[field]||{}))if(typeof v!=='string'||v.length>limit)throw new HttpError(400,'INVALID_STATE');
   if(value.manualItems!==undefined&&!Array.isArray(value.manualItems))throw new HttpError(400,'INVALID_INGREDIENT');
   for(const i of value.manualItems||[])if(!object(i)||!id(i.ingredient_id)||typeof i.ingredient_name!=='string'||i.ingredient_name.length>150||String(i.unit||'').length>20||String(i.quantity??'').length>40)throw new HttpError(400,'INVALID_INGREDIENT');
  }
  if(key==='boschetto-calendar-v1')for(const [day,entries] of Object.entries(value)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new HttpError(400,'INVALID_CALENDAR');
   if(typeof entries==='string'){if(!id(entries))throw new HttpError(400,'INVALID_CALENDAR');continue}
   if(!Array.isArray(entries)||entries.length>100||entries.some(e=>!object(e)||!id(e.id)||!id(e.recipeId)))throw new HttpError(400,'INVALID_CALENDAR');
  }
  if(key==='boschetto-shopping-v1')for(const field of ['order','excluded'])if(value[field]!==undefined&&(!Array.isArray(value[field])||value[field].some(v=>typeof v!=='string'||v.length>400)))throw new HttpError(400,'INVALID_SHOPPING');
  if(key==='boschetto-nutrition-v1')for(const [key,r] of Object.entries(value)){
   if(!id(key)||!object(r)||!['100g','portion'].includes(r.basis)||!object(r.values)||String(r.portion_label||'').length>120)throw new HttpError(400,'INVALID_NUTRITION');
   for(const basis of ['100g','portion'])for(const field of ['kcal','protein','carbs','fat']){const n=r.values[basis]?.[field];if(n!==null&&n!==undefined&&(typeof n!=='number'||!Number.isFinite(n)||n<0))throw new HttpError(400,'INVALID_NUTRITION')}
   if(r.portion_grams!==null&&r.portion_grams!==undefined&&(!Number.isFinite(r.portion_grams)||r.portion_grams<=0))throw new HttpError(400,'INVALID_NUTRITION');
  }
 }
 return values;
}
export function hasUserData(values){for(const [key,encoded] of Object.entries(values)){const v=JSON.parse(encoded);if(key==='boschetto-v1'){if(['customRecipes','individual','manualItems','selected'].some(k=>v[k]?.length)||['editedRecipes','recipeTags','amounts','units'].some(k=>Object.keys(v[k]||{}).length))return true}else if(key==='boschetto-shopping-v1'){if(v.order?.length||v.excluded?.length)return true}else if(Object.keys(v).length)return true}return false}
export async function readState(db){let row;try{row=await db.prepare('SELECT revision, state_json FROM family_state WHERE id = 1').first()}catch{throw new HttpError(503,'DATABASE_NOT_INITIALIZED')}if(!row)throw new HttpError(503,'DATABASE_NOT_INITIALIZED');return {revision:row.revision,values:JSON.parse(row.state_json)}}
