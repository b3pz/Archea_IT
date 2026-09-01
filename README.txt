ARCHEA SERVICE DESK V1.6

FIX / NOVITÀ
- Le notifiche dei commenti non dipendono più dal frontend:
  ora vengono create da trigger Supabase lato database.
- Nuovo commento USER -> notifica IT.
- Nuovo commento IT -> notifica USER.
- Le note interne IT NON notificano l'utente.
- Nuovo ticket -> notifica IT.
- Cambio stato -> notifica USER.
- Proposta appuntamento -> notifica USER.
- L'utente può CONFERMARE oppure indicare "NON POSSO".
- Conferma/rifiuto appuntamento -> notifica IT.
- Campanella si aggiorna automaticamente ogni 30 secondi.

PRIMA DI PUBBLICARE
1. Supabase > SQL Editor > New query.
2. Esegui migration_v1_6_notifications_appointments.sql UNA VOLTA.
3. GitHub: sostituisci index.html, styles.css, app.js.
4. Mantieni logo_archea.png.
5. Commit changes.
6. Attendi GitHub Pages e fai CTRL+F5.

TEST CONSIGLIATO
A) Rider commenta un ticket -> Giuseppe deve vedere una notifica.
B) Giuseppe commenta senza "Nota interna" -> Rider deve vedere una notifica.
C) Giuseppe manda appuntamento -> Rider vede "Appuntamento da confermare".
D) Rider conferma -> Giuseppe riceve "Appuntamento confermato".
