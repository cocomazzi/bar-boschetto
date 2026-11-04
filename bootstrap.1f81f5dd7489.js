import {initialize,finishInitialization} from './storage.cb1385d53abc.js';
const main=document.querySelector('main');main.inert=true;
try{await initialize();await import('./app.0a3bb7f846ef.js');await import('./nutrition.9186d9af0e79.js');await import('./recipe-nutrition.cba002f94ada.js');await import('./interface.468abe3794ee.js');finishInitialization();main.inert=false}catch(error){
 console.error('Initialization failed:',error.code||error.message);
 const message=error.code==='SUPABASE_NOT_INITIALIZED'?'Supabase pronto per il collegamento: esegui supabase/setup.sql nel SQL Editor del progetto.':error.status===401?'La sessione è scaduta. Ricarica e accedi di nuovo.':'Impossibile collegarsi a Supabase. I dati locali originali restano conservati.';
 document.querySelector('#sync-message').textContent=message;document.querySelector('#sync-reload').hidden=false;document.querySelector('#sync-reload').onclick=()=>location.reload();
}
