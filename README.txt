ARCHEA SERVICE DESK V1.5

NOVITÀ
- Restyling grafico più elegante e corporate.
- Logo Archea Associati integrato in login e sidebar.
- Campanella notifiche con contatore.
- Notifiche interne USER:
  * commento IT
  * cambio stato
  * appuntamento fissato
- Notifiche interne IT:
  * nuovo ticket
  * risposta dell'utente
- USER vede solo Apri ticket + I miei ticket + i propri dettagli.
- IT mantiene dashboard, calendario, movimenti, prenotazioni e censimento.

PRIMA DI PUBBLICARE
1. Supabase > SQL Editor
2. Esegui migration_v1_5_notifications.sql una sola volta.
3. Se NON hai ancora eseguito la migration appuntamenti della V1.4, esegui anche migration_v1_4_appointments.sql.

GITHUB
Sostituisci/carica nella root:
- index.html
- styles.css
- app.js
- logo_archea.png

Poi Commit changes e CTRL+F5.

NOTA
In questa versione le notifiche sono interne al portale.
Telegram ed email non sono ancora collegati, così evitiamo spam finché non definiamo esattamente quali eventi devono uscire dal portale.
