import {initialize,finishInitialization} from './storage.364e5273a07e.js';
const main=document.querySelector('main');main.inert=true;
try{await initialize();await import('./app.954995a7a479.js');await import('./nutrition.aaac1c30a6fe.js');await import('./recipe-nutrition.2c567af3e7a7.js');finishInitialization();main.inert=false}catch(error){
 console.error('Initialization failed:',error.code||error.message);
 const message=error.code==='SUPABASE_NOT_INITIALIZED'?'Supabase pronto per il collegamento: esegui supabase/setup.sql nel SQL Editor del progetto.':error.status===401?'La sessione è scaduta. Ricarica e accedi di nuovo.':'Impossibile collegarsi a Supabase. I dati locali originali restano conservati.';
 document.querySelector('#sync-message').textContent=message;document.querySelector('#sync-reload').hidden=false;document.querySelector('#sync-reload').onclick=()=>location.reload();
}
