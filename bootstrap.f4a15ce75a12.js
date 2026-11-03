import {initialize,finishInitialization} from './storage.7f54b11d2d07.js';
const main=document.querySelector('main');main.inert=true;
try{await initialize();await import('./app.81db61b3bd59.js');await import('./nutrition.60376b932ef5.js');await import('./recipe-nutrition.6ae2f2105942.js');await import('./interface.19827193ed38.js');finishInitialization();main.inert=false}catch(error){
 console.error('Initialization failed:',error.code||error.message);
 const message=error.code==='SUPABASE_NOT_INITIALIZED'?'Supabase pronto per il collegamento: esegui supabase/setup.sql nel SQL Editor del progetto.':error.status===401?'La sessione è scaduta. Ricarica e accedi di nuovo.':'Impossibile collegarsi a Supabase. I dati locali originali restano conservati.';
 document.querySelector('#sync-message').textContent=message;document.querySelector('#sync-reload').hidden=false;document.querySelector('#sync-reload').onclick=()=>location.reload();
}
