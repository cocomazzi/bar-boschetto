import {initialize,finishInitialization} from './storage.c6ba295a607c.js';
const main=document.querySelector('main');main.inert=true;
try{await initialize();await import('./app.8ac258257294.js');await import('./nutrition.4133e2fa43b4.js');await import('./recipe-nutrition.06bfe12e1c68.js');await import('./interface.d2eb0d029e2b.js');finishInitialization();main.inert=false}catch(error){
 console.error('Initialization failed:',error.code||error.message);
 const message=error.code==='SUPABASE_NOT_INITIALIZED'?'Supabase pronto per il collegamento: esegui supabase/setup.sql nel SQL Editor del progetto.':error.status===401?'La sessione è scaduta. Ricarica e accedi di nuovo.':'Impossibile collegarsi a Supabase. I dati locali originali restano conservati.';
 document.querySelector('#sync-message').textContent=message;document.querySelector('#sync-reload').hidden=false;document.querySelector('#sync-reload').onclick=()=>location.reload();
}
