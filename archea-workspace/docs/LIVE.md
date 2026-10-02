# Collegamento live a Google Fogli (non implementato)

Obiettivo: lettura autenticata, solo lato server, senza rendere pubblico il foglio.

1. **Backend** (es. funzione serverless/Node) con credenziali solo come variabili d'ambiente.
2. **Lettura**: service account con accesso *sola lettura* condiviso sul solo documento `SPREADSHEET_ID` (`src/config/sheets.ts`). Leggere le schede per `gid` (`SHEET_GIDS`, da compilare) con `spreadsheets.get` includeGridData o `values.batchGet`, convertire in `RawWorkbook` e chiamare `buildDataset(wb, 'live', …)`: i parser sono gli stessi dell'import Excel.
3. **Login**: Google Sign-In. Il server verifica il token, cerca l'email in `ACCOUNTS` (da compilare esplicitamente) e applica `permissions.ts` **prima** di rispondere: il client non riceve i dati che non può vedere (ore degli altri incluse).
4. **Cache** lato server (es. 1–5 min) con pulsante «Aggiorna»; non rileggere il calendario ore a ogni cambio schermata.
5. **Client**: implementare `googleSheetsSource.load()` in `src/data/adapters/index.ts` con `fetch('/api/dataset')`; al logout svuotare lo stato. Non usare localStorage né cache del service worker per dati privati.
6. Prima dell'attivazione: confermare le decisioni in sospeso del README e verificare la formula di stato del foglio e la grafia di «Francesco Dall'O'».
