import {authenticate} from '../../server/auth.js';
import {HttpError,safeError} from '../../server/http.js';
export async function onRequest(context){
 try{
  context.data.user=await authenticate(context.request,context.env);
  if(!context.env.DB)throw new HttpError(503,'DATABASE_NOT_BOUND');
  if(!['GET','HEAD'].includes(context.request.method)){
   if(context.request.headers.get('Origin')!==new URL(context.request.url).origin)throw new HttpError(403,'INVALID_ORIGIN');
   if(!context.request.headers.get('Content-Type')?.startsWith('application/json'))throw new HttpError(415,'JSON_REQUIRED');
  }
  return await context.next();
 }catch(error){return safeError(error)}
}
