# Attivare Supabase per Bar Boschetto

Il sito è pubblico. Il ricettario originale è consultabile senza login. Per modificare ricette, calendario, nutrienti e spesa si accede con email e password. Usando lo **stesso account** da due dispositivi si ritrovano gli stessi dati. Un altro account ha uno spazio separato.

Progetto: `https://yplzkvtfsyfnrixdadvz.supabase.co`.
Il collegamento GitHub del progetto Supabase **non esegue automaticamente** lo script SQL presente nella repository.

## 1. Crea tabella e funzioni

Apri [SQL Editor](https://supabase.com/dashboard/project/yplzkvtfsyfnrixdadvz/sql/new), incolla l’intero contenuto di [supabase/setup.sql](supabase/setup.sql) e premi Run. Lo script è idempotente e non elimina dati esistenti.

Crea:

- `bb_account_state`: stato familiare JSON per account, con revisione;
- Row Level Security: lettura solo della riga con il proprio `auth.uid()`;
- `bb_get_state`: lettura dello stato dell’account autenticato;
- `bb_save_state`: salvataggio atomico con controllo della revisione e validazione dei dati.

Gli utenti anonimi non possono leggere o modificare lo stato. Le scritture dirette alla tabella sono negate: passano dalla funzione di salvataggio. Le funzioni non accettano un ID utente fornito dal browser, ma usano l’identità autenticata da Supabase.

Il ricettario originale resta in `data.json`; lo stato dell’account contiene nuove ricette, modifiche, tag, calorie/macronutrienti, calendario, selezioni, prodotti manuali e ordine della spesa.

## 2. Prepara l’account condiviso

In Authentication → Users crea il vostro utente con email e password, completando la conferma email se richiesta. Non inviare la password in chat e non inserirla nella repository.

L’interfaccia offre solo Accedi/Esci, senza registrazione pubblica. Puoi disabilitare le nuove registrazioni nelle impostazioni Auth se vuoi gestire gli account solo dal dashboard. Il progetto deve consentire l’accesso email/password e le sessioni su più dispositivi.

L’account usato dentro l’app è un utente **Supabase Auth**: non è il login del dashboard Supabase né l’account GitHub.

## 3. Hosting

Cloudflare Pages continua a pubblicare il frontend da `main`, directory `/`. Non servono Cloudflare Access, binding D1 né variabili `ACCESS_*` per questa versione. Non è necessario cancellare il database D1.

Le vecchie Pages Functions e la relativa configurazione sono state rimosse dalla repository. Le richieste partono direttamente dal browser verso Supabase con il client ufficiale vendorizzato e le politiche del database.

`supabase-config.js` contiene solo Project URL e Publishable key: sono parametri pubblici. Non usare mai una Secret key o service_role nel frontend.

La versione GitHub Pages usa lo stesso backend Supabase; le sessioni di login sono separate per dominio, mentre i dati dello stesso account sono condivisi. Accedi separatamente su ciascun sito/dispositivo.

## 4. Prova

1. Apri il sito: senza login puoi consultare e cercare le ricette.
2. Premi Accedi con l’account creato in Authentication → Users.
3. Se compare la richiesta di eseguire lo script SQL, completa il passaggio 1 e ricarica.
4. Aggiungi una ricetta o un ingrediente alla spesa e attendi **Sincronizzato con la famiglia**.
5. Accedi da un altro dispositivo con lo stesso account e verifica i dati.

Le modifiche remote vengono controllate ogni 15 secondi e al ritorno nella scheda. Un modulo aperto non viene ricaricato automaticamente: compare un avviso. Se due dispositivi modificano una revisione vecchia, il salvataggio viene fermato senza sovrascrivere il primo. Usa Backup per conservare le modifiche locali non inviate prima di ricaricare.

## 5. Importa le modifiche già presenti nel browser

I dati locali precedenti vengono conservati. Dopo il login, **Importa dati del browser** mostra un riepilogo e richiede conferma. Funziona soltanto se lo spazio dell’account non contiene già modifiche personali.

Per spostare dati fra GitHub Pages e Cloudflare, usa Backup sul sito di origine e Carica backup sul sito di destinazione. Il browser non condivide il localStorage fra due domini.

## Sviluppo

Client ufficiale `@supabase/supabase-js` 2.118.0, distribuzione UMD, in `vendor/` con licenza MIT. Nessuna dipendenza runtime da CDN esterni.

Dopo una modifica a JS/CSS esegui `python scripts/build-assets.py`: aggiorna gli asset con hash e i riferimenti. Non ricreare `dist/`.

Test SQL in PostgreSQL locale tramite PGlite:

```sh
npm install --prefix tests --ignore-scripts
npm test --prefix tests
```

I test non si collegano al progetto Supabase remoto e non creano account reali.
