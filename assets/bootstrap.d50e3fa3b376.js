import {initialize,finishInitialization} from './storage.013c042710d4.js';
const main=document.querySelector('main');main.inert=true;
try{await initialize();await import('./app.cbed1d50cc0d.js');await import('./nutrition.85f61ea76183.js');await import('./recipe-nutrition.a13b7fac8a7a.js');await import('./interface.6e879facb1f4.js');await import('./mobile.90504450c410.js');finishInitialization();main.inert=false}catch(error){
 console.error('Initialization failed:',error.code||error.message);
 const message=error.code==='SUPABASE_NOT_INITIALIZED'?'Supabase pronto per il collegamento: esegui supabase/setup.sql nel SQL Editor del progetto.':error.status===401?'La sessione è scaduta. Ricarica e accedi di nuovo.':'Impossibile collegarsi a Supabase. I dati locali originali restano conservati.';
 document.querySelector('#sync-message').textContent=message;document.querySelector('#sync-reload').hidden=false;document.querySelector('#sync-reload').onclick=()=>location.reload();
}
