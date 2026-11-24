# BAAL AFTER DARK – Post Builder v3 (bozza coordinata)

Versione statica per GitHub Pages. Non scrive direttamente nel repository: l'archivio hashtag può essere esportato, modificato e poi sostituito manualmente nel repository.

## Struttura
- `index.html`: interfaccia
- `css/style.css`: stile
- `js/app.js`: logica
- `data/taxonomy.json`: tassonomia attuale, conservata senza espansioni
- `data/hashtags.json`: Dizionario Slang X attuale, conservato
- `data/subjects.json`: prelista vuota e categorie verificate

## Installazione
Sostituire i file della copia di lavoro, mantenendo le tre cartelle e i percorsi indicati. Non sovrascrivere la versione online prima dei test.

## Limiti di questa versione
- Il Builder prepara una scheda da copiare in ChatGPT; non genera autonomamente il copy e non esegue controlli AI.
- I suggerimenti hashtag derivano dai pacchetti esistenti e da regole contestuali iniziali; non sono dati di popolarità né trend verificati.
- L'esportazione hashtag scarica il JSON corrente; la persistenza richiede la sostituzione manuale del file nel repository.
- La tassonomia mantiene i generi attuali come stringhe. Il livello sottogenere non è ancora popolato.
