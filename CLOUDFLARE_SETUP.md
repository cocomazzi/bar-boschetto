# Attivazione backend Cloudflare

Destinazione: https://bar-boschetto.pages.dev/ — binding D1: `DB` — database: `bar-boschetto-db`.

Il codice non modifica le impostazioni dell’account Cloudflare e non inizializza il database durante una normale visita. Finché Access, binding e tabelle non sono configurati, le API rifiutano le richieste. GitHub Pages e localhost continuano in modalità locale.

## 1. Proteggere il sito e le API

In Cloudflare Zero Trust crea un’applicazione Access di tipo Self-hosted per **bar-boschetto.pages.dev**, senza limitare il percorso. Crea una policy Allow per gli indirizzi email dei familiari. Non usare una policy Bypass. Se usi le preview, proteggi separatamente anche i relativi hostname; non collegarle al database di produzione senza la stessa protezione.

Nelle impostazioni della Page, variabili di ambiente di **Production**, aggiungi:

| Variabile | Valore |
| --- | --- |
| `ACCESS_TEAM_DOMAIN` | Il dominio del team, ad esempio `famiglia.cloudflareaccess.com` |
| `ACCESS_AUD` | Application Audience (AUD) dell’app Access |

Il backend verifica crittograficamente firma RS256, issuer, audience e scadenza del token `Cf-Access-Jwt-Assertion`. Nessun token o password deve essere inserito nel codice. Team domain e AUD sono identificatori di configurazione, non credenziali del database.

Proteggi esplicitamente il dominio di produzione: l’opzione Pages per le anteprime da sola non protegge necessariamente `bar-boschetto.pages.dev`.

## 2. Binding e impostazioni Pages

- Repository: `cocomazzi/bar-boschetto`; production branch: `main`.
- Framework preset: None; build output directory: `.` (radice della repository).
- I file generati sono già inclusi, quindi non serve un comando di build per il deployment corrente.
- Binding D1 di Production: variabile `DB`, database `bar-boschetto-db`.
- Pages compila automaticamente `functions/`; non usare un semplice upload dei soli asset.

## 3. Inizializzare D1

Con Wrangler autenticato nel tuo account, dalla radice della repository:

```sh
npx wrangler d1 execute bar-boschetto-db --remote --file=migrations/0001_schema.sql
npx wrangler d1 execute bar-boschetto-db --remote --file=migrations/0002_seed.sql
```

In alternativa, esegui il contenuto dei due file SQL in ordine nella console D1. Sono idempotenti: l’importazione iniziale usa `INSERT OR IGNORE` e non sovrascrive righe già presenti. Non inserire chiavi API o dati di accesso nella repository.

Controlli nella console:

```sql
SELECT COUNT(*) FROM ricette;              -- 99
SELECT COUNT(*) FROM ricette_ingredienti;  -- 592
SELECT COUNT(*) FROM catalogo_ingredienti; -- 190
SELECT revision FROM family_state WHERE id=1;
```

La creazione del database e il suo collegamento non eseguono questi SQL automaticamente.

## 4. Redeploy e prova

Esegui un nuovo deployment Cloudflare dopo aver configurato binding e variabili. Apri il sito, completa l’accesso e controlla lo stato sopra il ricettario. Dopo una modifica deve apparire **Sincronizzato con la famiglia**. Verifica da un secondo dispositivo autorizzato: i cambiamenti vengono rilevati ogni 15 secondi o al ritorno nella scheda. Se un modulo è aperto compare l’invito a ricaricare, senza perderne il contenuto automaticamente.

Le API `GET /api/bootstrap`, `GET /api/state`, `PUT /api/state` richiedono sempre Access. Una PUT richiede inoltre origine uguale al sito, JSON valido e revisione corrente. Una revisione non più valida restituisce 409 e non sovrascrive i dati remoti.

## 5. Recuperare i dati del browser

I dati di GitHub Pages appartengono a un’origine diversa da Cloudflare. Il browser non permette al nuovo sito di leggerli direttamente.

- **Backup** permette di esportare dati locali, stato condiviso e copie delle modifiche non inviate.
- Se i dati locali sono presenti sulla stessa origine Cloudflare e lo spazio condiviso è ancora vuoto, **Importa dati del browser** mostra un riepilogo e richiede conferma.
- L’importazione rifiuta uno spazio già popolato; non unisce automaticamente dati concorrenti.
- Per trasferire un backup da GitHub Pages al nuovo dominio usa la funzione **Carica backup** del sito Cloudflare e conferma il riepilogo. Il file resta sul dispositivo finché non confermi.

## Modello dati

Le tre tabelle `ricette`, `ricette_ingredienti` e `catalogo_ingredienti` conservano il ricettario originale e gli ID. `family_state` conserva un documento JSON condiviso versionato: ricette nuove, modifiche, tag, calendario con inserimenti multipli, spesa manuale, selezioni, ordine, esclusioni e dati nutrizionali.

Questa prima integrazione mantiene la logica attuale e salva atomicamente l’intero stato familiare, con controllo di revisione. Le modifiche non vengono riscritte nelle tabelle del ricettario originale. Per un uso familiare evita perdite da sovrascrittura; in futuro le entità modificabili potranno essere normalizzate in tabelle dedicate. Dimensione massima dello stato trasmesso: 2 MB.

Le modifiche restano in una coda locale finché il server non conferma. Il messaggio temporaneo “aggiunto!” o “modificato” indica l’azione nell’interfaccia; lo stato persistente in alto conferma l’invio effettivo. In caso di conflitto scarica il backup e ricarica; non viene applicata una fusione automatica.

## Sviluppo e controlli

```sh
node --test tests/backend.test.mjs
python scripts/create-seed.py
python scripts/build-assets.py
```

I file SQL e di codice presenti nella repository sono visibili a chi può leggere la repository. Il dominio GitHub Pages resta una copia statica locale: per l’uso condiviso entra dal dominio Cloudflare.
