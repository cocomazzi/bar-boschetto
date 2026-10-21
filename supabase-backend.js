import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
let client,account=null;
const $=s=>document.querySelector(s);
export const signedIn=()=>!!account;
export function openLogin(){if(!$('#login-dialog').open)$('#login-dialog').showModal();$('#login-email').focus()}
function errorMessage(error){if(error.message==='Invalid login credentials')return 'Email o password non corretti.';if(error.message==='Email not confirmed')return 'Conferma prima l’indirizzo email dell’account.';return 'Accesso non riuscito. Controlla i dati e la connessione.'}
export async function initializeAccount(){
 if(!window.supabase?.createClient)throw Error('Libreria Supabase non disponibile.');
 client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data,error}=await client.auth.getSession();if(error)throw error;account=data.session?.user||null;
 $('#account-email').textContent=account?.email||'';$('#account-login').hidden=!!account;$('#account-logout').hidden=!account;
 $('#account-login').onclick=openLogin;$('#login-cancel').onclick=()=>$('#login-dialog').close();
 $('#login-form').onsubmit=async e=>{e.preventDefault();if(!e.target.reportValidity())return;const button=$('#login-submit');button.disabled=true;$('#login-error').textContent='';try{const result=await client.auth.signInWithPassword({email:$('#login-email').value.trim(),password:$('#login-password').value});if(result.error)throw result.error;$('#login-password').value='';location.reload()}catch(error){$('#login-error').textContent=errorMessage(error);$('#login-password').value=''}finally{button.disabled=false}};
 client.auth.onAuthStateChange((event,session)=>{if((event==='SIGNED_OUT'&&account)||(event==='SIGNED_IN'&&account&&session?.user.id!==account.id)){document.querySelector('main').inert=true;setTimeout(()=>location.reload(),0)}});
 const mutationSelector='#new-recipe,[data-new-category],[data-edit-recipe],[data-edit-tags],[data-select],[data-line],[data-amount],[data-unit],[data-pick-day],[data-remove-entry],[data-remove-day],#clear,[data-remove],[data-move-shop],#add-ingredient,#sync-import,#sync-upload';
 document.addEventListener('click',e=>{if(!account&&e.target.closest(mutationSelector)){e.preventDefault();e.stopImmediatePropagation();openLogin()}},true);
 document.addEventListener('submit',e=>{if(!account&&e.target.id!=='login-form'){e.preventDefault();e.stopImmediatePropagation();openLogin()}},true);
 document.addEventListener('keydown',e=>{if(!account&&e.target.matches?.('[data-amount],[data-unit]')){e.preventDefault();openLogin()}},true);
 document.addEventListener('dragstart',e=>{if(!account&&e.target.closest('[data-drag-recipe],[data-shop-key]')){e.preventDefault();openLogin()}},true);
 return account;
}
export async function logout(){const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;location.reload()}
export async function remoteApi(path,options={}){
 const method=options.method||'GET';let result;
 if(method==='PUT'){const body=JSON.parse(options.body);result=await client.rpc('bb_save_state',{p_revision:body.revision,p_values:body.values,p_import:!!body.import})}else result=await client.rpc('bb_get_state');
 if(result.error){const error=Error(result.error.message);error.code=result.error.code;error.status=result.error.code==='40001'?409:['42501','PGRST301','PGRST303'].includes(result.error.code)?401:500;if(result.error.code==='PGRST202'||result.error.code==='42P01')error.code='SUPABASE_NOT_INITIALIZED';throw error}
 if(path==='bootstrap'){const response=await fetch('./data.json',{cache:'no-cache'});if(!response.ok)throw Error('Ricettario non disponibile');return {...result.data,user:account.id,catalog:await response.json()}}
 return result.data;
}
