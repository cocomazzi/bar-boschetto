import {initialize,finishInitialization} from './storage.840be6371b1a.js';
const main=document.querySelector('main');main.inert=true;
try{await initialize();await import('./app.18adb35e350b.js');await import('./nutrition.7f36fba4d292.js');await import('./recipe-nutrition.6606b7ecf19b.js');await import('./interface.bb5b3fc4b43b.js');finishInitialization();main.inert=false}catch(error){
 console.error('Initialization failed:',error.code||error.message);
 const message=error.code==='SUPABASE_NOT_INITIALIZED'?'Supabase pronto per il collegamento: esegui supabase/setup.sql nel SQL Editor del progetto.':error.status===401?'La sessione è scaduta. Ricarica e accedi di nuovo.':'Impossibile collegarsi a Supabase. I dati locali originali restano conservati.';
 document.querySelector('#sync-message').textContent=message;document.querySelector('#sync-reload').hidden=false;document.querySelector('#sync-reload').onclick=()=>location.reload();
}
