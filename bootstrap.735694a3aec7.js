import {initialize} from './storage.d68eed259a36.js';
const main=document.querySelector('main');main.inert=true;
try{await initialize();await import('./app.4aded64efa7c.js');await import('./nutrition.b3654dbded4b.js');main.inert=false}catch(error){
 const message=error.code==='ACCESS_NOT_CONFIGURED'?'Backend in attesa di configurazione Cloudflare Access.':error.status===401?'Accedi con un account autorizzato e ricarica.':error.code==='DATABASE_NOT_INITIALIZED'?'Il database deve essere inizializzato con gli script SQL.':error.code==='CATALOG_NOT_IMPORTED'?'Importa il ricettario iniziale nel database.':error.code==='DATABASE_NOT_BOUND'?'Configura il binding D1 con nome DB.':'Impossibile collegarsi al backend. I dati locali originali restano conservati.';
 document.querySelector('#sync-message').textContent=message;document.querySelector('#sync-reload').hidden=false;document.querySelector('#sync-reload').onclick=()=>location.reload();
}
