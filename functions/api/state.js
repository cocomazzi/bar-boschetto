import {json,HttpError} from '../../server/http.js';
import {readState,validateState,hasUserData} from '../../server/state.js';
export async function onRequestGet({env}){return json(await readState(env.DB))}
export async function onRequestPut({env,request,data}){
 if(Number(request.headers.get('Content-Length'))>2000000)throw new HttpError(413,'STATE_TOO_LARGE');
 const raw=await request.text();if(new TextEncoder().encode(raw).length>2000000)throw new HttpError(413,'STATE_TOO_LARGE');
 let body;try{body=JSON.parse(raw)}catch{throw new HttpError(400,'INVALID_JSON')}
 if(!Number.isSafeInteger(body.revision)||body.revision<0)throw new HttpError(400,'INVALID_REVISION');
 const values=validateState(body.values);
 if(body.import){const previous=await readState(env.DB);if(previous.revision!==body.revision||hasUserData(previous.values))throw new HttpError(409,'IMPORT_REQUIRES_EMPTY_STATE')}
 const result=await env.DB.prepare('UPDATE family_state SET state_json = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = 1 AND revision = ?').bind(JSON.stringify(values),data.user.id,body.revision).run();
 if(result.meta.changes!==1)throw new HttpError(409,'STATE_CONFLICT');
 return json({revision:body.revision+1});
}
