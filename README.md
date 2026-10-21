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
- `data.json`: ricettario originale (99 ricette, 592 associazioni, 190 ingredienti).
- `supabase/setup.sql`: schema, RLS, validazione e funzioni di salvataggio.
- `vendor/`: client ufficiale Supabase 2.118.0 con licenza MIT.

Dopo una modifica eseguire `python scripts/build-assets.py`. Pubblicare la radice della repository. Il client Supabase è incluso localmente; non occorre un build npm per il sito.

## Test SQL

`npm install --prefix tests --ignore-scripts` e `npm test --prefix tests` eseguono test PostgreSQL locali tramite PGlite senza collegarsi al progetto remoto o creare utenti reali.
