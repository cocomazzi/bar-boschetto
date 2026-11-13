const main = document.querySelector('main');
main.inert = true;

try {
 const {initialize, finishInitialization} = await import('./storage.js');
 await initialize();
 await import('./app.js');
 await import('./nutrition.js');
 await import('./recipe-nutrition.js');
 await import('./interface.js');
 await import('./mobile.js');
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
