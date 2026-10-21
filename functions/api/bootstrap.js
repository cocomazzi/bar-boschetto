import {json,HttpError} from '../../server/http.js';
import {readState} from '../../server/state.js';
export async function onRequestGet({env,data}){
 const state=await readState(env.DB);
 const result=await env.DB.batch(['SELECT payload_json FROM ricette ORDER BY recipe_id','SELECT payload_json FROM ricette_ingredienti ORDER BY recipe_id, position','SELECT payload_json FROM catalogo_ingredienti ORDER BY ingredient_id'].map(sql=>env.DB.prepare(sql)));
 const [ricette,ricette_ingredienti,catalogo_ingredienti]=result.map(r=>r.results.map(row=>JSON.parse(row.payload_json)));
 if(!ricette.length||!catalogo_ingredienti.length)throw new HttpError(503,'CATALOG_NOT_IMPORTED');
 return json({...state,user:data.user.id,catalog:{ricette,ricette_ingredienti,catalogo_ingredienti}});
}
