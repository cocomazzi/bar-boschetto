# Bar Boschetto

Web app statica per ricettario familiare, calendario settimanale e lista della spesa.

## Struttura e pubblicazione

Il codice è nella radice del branch `main`. La cartella `dist/` è stata rimossa.

- `index.html`: interfaccia e moduli.
- `app.js`: ricette, filtri, calendario e lista della spesa.
- `nutrition.js`: catalogo nutrizionale compilabile.
- `style.css`: stile responsive.
- `data.json`: 99 ricette, 592 associazioni e 190 ingredienti importati dall’Excel.

I file con hash nel nome sono asset di pubblicazione per evitare copie obsolete in cache. Dopo modifiche a JS/CSS, rigenerare il file con hash e aggiornare il riferimento in `index.html`.

GitHub Pages pubblica da `main`, cartella `/ (root)`. `.nojekyll` abilita la pubblicazione statica. La vecchia configurazione Sites che puntava a `dist/` è stata rimossa.

Per l’anteprima locale servire la radice via HTTP, ad esempio `python -m http.server 8770`.

## Funzioni

Ricerca bilingue IT/NL, categorie espandibili, tag multipli, viste Categorie e Tabella, creazione e modifica di ricette, ingredienti e note condivisi tra le viste. Calendario settimanale sticky con trascinamento e scelta a clic. Spesa laterale richiudibile con selezione singola, quantità e unità modificabili, aggiunta manuale, aggregazione, cestino e copia.

Catalogo nutrizionale compilabile per 100 g o porzione, senza stime automatiche.

## Salvataggio

Modifiche e dati personali restano nel localStorage del browser. Non vengono sincronizzati tra dispositivi, GitHub o Excel.


## Calendario e lista della spesa

Ogni ricetta pianificata aggiunge un contributo indipendente alla spesa. Rimuoverla da un giorno elimina solo quel contributo; restano gli altri giorni e le selezioni manuali. Il cestino e Svuota escludono anche le voci del calendario dalla spesa senza cancellare il piano. Rimuovere e riassegnare la ricetta ripristina i suoi ingredienti.

La spesa si riordina trascinando le righe oppure con le frecce su/giù. L’ordine è salvato nel browser ed è rispettato anche nella copia della lista. Pop-up temporanei confermano l’aggiunta di un ingrediente singolo e la modifica di una ricetta.
