# Bar Boschetto

Ricettario familiare con calendario settimanale, catalogo ingredienti e lista della spesa.

## Backend Supabase

Il sito è pubblico e consultabile senza login. Accedendo con lo stesso account Supabase Auth su più dispositivi si condividono ricette, calendario, nutrienti e spesa. Le regole RLS isolano i dati di account differenti. Cloudflare Pages e GitHub Pages ospitano solo il frontend.

Per attivare il progetto, seguire [SUPABASE_SETUP.md](SUPABASE_SETUP.md): eseguire `supabase/setup.sql` nel SQL Editor e creare l’account in Authentication → Users. Collegare GitHub a Supabase non esegue automaticamente il file SQL.

La configurazione pubblica è in `supabase-config.js`. Non inserire Secret key, service_role o password nella repository. Cloudflare Access e il binding D1 non sono più richiesti. Il precedente database D1 non viene cancellato.

## Funzioni

Categorie espandibili e vista tabella, ricerca bilingue IT/NL, tag multipli, creazione e modifica ricette, ingredienti e note. Calendario sticky con più ricette al giorno e trascinamento. Spesa laterale con contributi per singolo inserimento, prodotti manuali, quantità e unità modificabili, riordino, cestino e copia. Catalogo nutrizionale compilabile per 100 g o porzione.

## Salvataggio e trasferimento

Lo stato dell’account è salvato in Supabase con revisione atomica. Le modifiche non inviate restano recuperabili nei backup locali. I conflitti tra dispositivi non sovrascrivono silenziosamente dati remoti. Controllare il messaggio “Sincronizzato con la famiglia” dopo le modifiche.

I dati locali precedenti vengono conservati e possono essere importati esplicitamente in uno spazio account ancora vuoto. Backup e Carica backup trasferiscono dati tra domini diversi. Non vengono modificati automaticamente l’Excel originale o i file del ricettario nella repository.

## File e pubblicazione

Il codice è nella radice di `main`; non esiste una copia in `dist/`. Gli asset con hash prevengono problemi di cache.

- `app.js`, `nutrition.js`, `style.css`: interfaccia e funzionalità.
- `storage.js`, `supabase-backend.js`, `bootstrap.js`: sincronizzazione e login.
- `data.json`: 99 ricette, 592 associazioni e copia del catalogo NEVO per la consultazione senza login.
- `supabase/ingredients-nevo2025.sql`: tabella ingredienti online, 190 ingredienti e 129 abbinamenti nutrizionali provvisori.
- `supabase/setup.sql`: schema, RLS, validazione e funzioni di salvataggio.
- `vendor/`: client ufficiale Supabase 2.118.0 con licenza MIT.

Dopo una modifica eseguire `python scripts/build-assets.py`. Pubblicare la radice della repository. Il client Supabase è incluso localmente; non occorre un build npm per il sito.

## Test SQL

`npm install --prefix tests --ignore-scripts` e `npm test --prefix tests` eseguono test PostgreSQL locali tramite PGlite senza collegarsi al progetto remoto o creare utenti reali.

## Catalogo ingredienti NEVO 2025

Dopo il login, il catalogo viene letto da `public.bb_ingredients` tramite `bb_get_ingredients`. Il ricettario continua a provenire da `data.json`. Prima di pubblicare questo aggiornamento, eseguire `supabase/ingredients-nevo2025.sql` nel progetto Supabase già configurato.

La migrazione compila solo campi NULL e non modifica righe con `manually_verified=true`. Gli zeri esistenti sono preservati. Codice NEVO, nome olandese, confidenza e motivazione sono registrati per ciascun campo in `nutrient_sources`. I 61 ingredienti senza un abbinamento affidabile rimangono senza valori.

Le correzioni nell’app continuano a essere salvate nello stato dell’account (`boschetto-nutrition-v1`) e hanno precedenza sui valori del catalogo di base. Non vengono sostituite dalla migrazione. Gli utenti dell’app possono leggere la tabella condivisa ma non modificarla direttamente: le correzioni manuali restano isolate per account.
