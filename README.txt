ARCHEA SERVICE DESK V1

1) Supabase > SQL Editor: eseguire supabase_security.sql una sola volta.
2) Verificare profiles:
   giuseppe.milano@archea.it -> IT
   rider.novelli@archea.it -> USER
3) Pubblicare index.html, styles.css e app.js nella root di un repository GitHub.
4) GitHub > Settings > Pages > Deploy from branch > main / root.

Funzioni:
- login email/password
- ruoli USER e IT
- apertura ticket
- storico personale
- dashboard IT
- commenti e note interne
- checklist IT
- stato e assegnazione ticket
- menu Movimenti, Prenotazioni e Censimento predisposti

Telegram NON è ancora nel frontend: il token del bot va tenuto lato server e verrà collegato con una Supabase Edge Function.
