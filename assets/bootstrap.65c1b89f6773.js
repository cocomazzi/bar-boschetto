const main = document.querySelector('main');
main.inert = true;

try {
 const {initialize, finishInitialization} = await import('./storage.3c32e4c1da79.js');
 await initialize();
 await import('./app.aef05bf8952f.js');
 await import('./nutrition.c278eb29585e.js');
 await import('./recipe-nutrition.8a2a3bf51e9c.js');
 await import('./interface.ab855f653368.js');
 await import('./mobile.e88b8d1cc0fb.js');
 finishInitialization();
 main.inert = false;
 delete document.body.dataset.startup;
} catch (error) {
 console.error('Initialization failed:', error.code || error.message);
 let message = 'Impossibile avviare Bar Boschetto. Controlla la connessione e riprova.';
 if (error.code === 'SUPABASE_NOT_INITIALIZED') {
  message = 'Supabase pronto per il collegamento: esegui supabase/setup.sql nel SQL Editor del progetto.';
 } else if (error.status === 401) {
  message = 'La sessione è scaduta. Ricarica e accedi di nuovo.';
 }
 document.querySelector('#startup-error').textContent = message;
 const retry = document.querySelector('#startup-retry');
 retry.onclick = () => location.reload();
 retry.hidden = false;
 document.body.dataset.startup = 'error';
}
