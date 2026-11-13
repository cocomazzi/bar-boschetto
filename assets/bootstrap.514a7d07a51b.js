import {initialize,finishInitialization} from './storage.36b98984d30b.js';
const main=document.querySelector('main');main.inert=true;
try{await initialize();await import('./app.19074303c23a.js');await import('./nutrition.bd24477102a7.js');await import('./recipe-nutrition.bfb66142fb82.js');await import('./interface.ba6b236e3656.js');await import('./mobile.2483f50c123b.js');finishInitialization();main.inert=false}catch(error){
 console.error('Initialization failed:',error.code||error.message);
 const message=error.code==='SUPABASE_NOT_INITIALIZED'?'Supabase pronto per il collegamento: esegui supabase/setup.sql nel SQL Editor del progetto.':error.status===401?'La sessione è scaduta. Ricarica e accedi di nuovo.':'Impossibile collegarsi a Supabase. I dati locali originali restano conservati.';
 document.querySelector('#sync-message').textContent=message;document.querySelector('#sync-reload').hidden=false;document.querySelector('#sync-reload').onclick=()=>location.reload();
}
