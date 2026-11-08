export function nextRecipeId(recipes){return 'R'+String(Math.max(0,...recipes.map(r=>/^R\d+$/.test(r.recipe_id)?Number(r.recipe_id.slice(1)):0))+1).padStart(3,'0')}
export function migrateRecipeIds(values,catalog){
 const state=JSON.parse(values['boschetto-v1']||'{}'),custom=state.customRecipes||[],used=[...catalog.ricette,...custom,...Object.values(state.editedRecipes||{})],mapping={};
 for(const recipe of custom)if(!/^R\d+$/.test(recipe.recipe_id)){const id=nextRecipeId(used);mapping[recipe.recipe_id]=id;used.push({recipe_id:id})}
 if(!Object.keys(mapping).length)return values;
 const id=value=>mapping[value]||value,line=value=>{const colon=value.indexOf(':');return colon<0?id(value):id(value.slice(0,colon))+value.slice(colon)};
 const recipe=r=>({...r,recipe_id:id(r.recipe_id),ingredients:r.ingredients.map(i=>({...i,recipe_id:id(i.recipe_id||r.recipe_id)}))});
 state.customRecipes=custom.map(recipe);
 state.editedRecipes=Object.fromEntries(Object.entries(state.editedRecipes||{}).map(([key,r])=>[id(key),recipe(r)]));
 state.recipeTags=Object.fromEntries(Object.entries(state.recipeTags||{}).map(([key,v])=>[id(key),v]));
 for(const key of ['selected','individual','checked'])if(state[key])state[key]=state[key].map(line);
 for(const key of ['amounts','units'])if(state[key])state[key]=Object.fromEntries(Object.entries(state[key]).map(([k,v])=>[line(k),v]));
 if(state.nutritionSettings?.recipeFirstPercent)state.nutritionSettings.recipeFirstPercent=Object.fromEntries(Object.entries(state.nutritionSettings.recipeFirstPercent).map(([k,v])=>[id(k),v]));
 const plan=JSON.parse(values['boschetto-calendar-v1']||'{}');for(const [day,entries] of Object.entries(plan))plan[day]=typeof entries==='string'?id(entries):entries.map(e=>({...e,recipeId:id(e.recipeId)}));
 return {...values,'boschetto-v1':JSON.stringify(state),'boschetto-calendar-v1':JSON.stringify(plan)};
}
