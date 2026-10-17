# Bar Boschetto

App statica responsive. Servire la cartella `dist` con un server HTTP (non aprire index.html via file://).

## Dati
`dist/data.json` conserva le tre strutture: ricette, ricette_ingredienti, catalogo_ingredienti. Gli ID collegano le tabelle. I dati derivano dal ricettario Excel fornito: 99 ricette, 592 associazioni, 190 ingredienti.

## Funzioni
Ricerca senza distinzione di accenti su ricette e ingredienti IT/NL, categoria principale e aggiuntive, tag multipli con logica AND, espansione indipendente delle ricette. Lista della spesa aggregata per ingredient_id e unità; quantità non numeriche conservate, unità diverse mantenute separate. Selezioni e acquisti salvati nel localStorage del browser.

## Evoluzioni
HTML, CSS, logica applicativa e dati separati. Nessun backend e nessuna sincronizzazione tra dispositivi in questa sessione. I campi nutrizionali originali restano nei dati senza essere mostrati in home.

Aggiornamento: categorie nel menu corrette, selezione singola degli ingredienti e quantità modificabili sotto ogni ricetta. Copia della lista negli appunti con alternativa manuale; il testo si può incollare in Google Keep. Le quantità modificate sono salvate nel browser e usate per l’aggregazione.

Nuove ricette: pulsante Nuova ricetta con nome, categoria esistente o nuova, porzioni, tag, ingredienti e note. Salvataggio locale verificato prima della chiusura del modulo. Il cestino nella spesa elimina tutti i contributi per lo stesso ingrediente e unità, aggiornando le selezioni nel ricettario.

Catalogo nutrizionale: 190 ingredienti dal foglio Catalogo ingredienti, più quelli delle ricette locali. Ricerca IT/NL e valori facoltativi di kcal, proteine, carboidrati e grassi. Basi separate per 100 grammi e porzione, con descrizione e peso facoltativi. Nessuna conversione o stima automatica. Dati salvati in localStorage sotto boschetto-nutrition-v1; non sincronizzati tra dispositivi. Il file Excel originale resta invariato.

Tag: pulsante + Tag su ogni ricetta per aggiungere o rimuovere tag. I suggerimenti sono disponibili anche nel modulo Nuova ricetta; nuovi tag possono essere scritti separandoli con punto e virgola. Deduplicazione, aggiornamento filtri e ricerca, salvataggio locale delle modifiche tramite recipeTags.

Spesa manuale: usa Aggiungi alla spesa per ingredienti o prodotti liberi con quantità e unità. I nomi riconosciuti nel catalogo o nelle ricette vengono aggregati per ID e unità; il cestino elimina anche i contributi manuali. Pubblicazione privata non completata: invio stdin al workflow di sincronizzazione rifiutato dalla policy di approvazione della sessione.
