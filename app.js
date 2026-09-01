
const BASE='https://igfpkpcksllmofqfoxkf.supabase.co';
const KEY='sb_publishable_wuq5rwy4w6ca7nvJTbrXzA_izhCmrf9';
let session=null,user=null,profile=null;
const $=i=>document.getElementById(i);
const esc=s=>(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fmt=d=>d?new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short'}).format(new Date(d)):'—';
const num=id=>`TKT-${new Date().getFullYear()}-${String(id).padStart(5,'0')}`;
const badge=s=>`<span class="badge ${s==='APERTO'?'open':s==='IN LAVORAZIONE'?'working':s==='CHIUSO'?'closed':''}">${esc(s)}</span>`;
const priorityBadge=p=>{
  p=p||'NORMALE';
  const c=p==='URGENTE'?'prio-urgent':p==='ALTA'?'prio-high':p==='BASSA'?'prio-low':'prio-normal';
  return `<span class="badge ${c}">${esc(p)}</span>`;
};
function toast(t){$('toast').textContent=t;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),2200)}
function page(t,s=''){$('title').textContent=t;$('subtitle').textContent=s}
function save(s){session=s;localStorage.setItem('archea_sd_session',JSON.stringify(s))}
function clear(){session=user=profile=null;localStorage.removeItem('archea_sd_session')}
async function api(path,{method='GET',body=null,auth=true,headers={}}={}){const h={'apikey':KEY,'Content-Type':'application/json',...headers};if(auth&&session?.access_token)h.Authorization='Bearer '+session.access_token;const r=await fetch(BASE+path,{method,headers:h,body:body?JSON.stringify(body):null});const tx=await r.text();let d=null;try{d=tx?JSON.parse(tx):null}catch{d=tx}if(!r.ok)throw new Error((d&&(d.msg||d.message||d.error_description||d.error))||`HTTP ${r.status}`);return d}
async function select(t,q=''){return api(`/rest/v1/${t}?${q}`)}
async function insert(t,b,ret=true){return api(`/rest/v1/${t}`,{method:'POST',body:b,headers:{Prefer:ret?'return=representation':'return=minimal'}})}
async function update(t,f,b){return api(`/rest/v1/${t}?${f}`,{method:'PATCH',body:b,headers:{Prefer:'return=representation'}})}
async function notify(){ /* V1.6: notifiche generate lato database */ }
async function profileByEmail(){ return null; }
async function allIT(){ return []; }

async function refreshNotifications(){
  const d=await select('notifications',`select=*&user_id=eq.${user.id}&order=created_at.desc&limit=30`);
  const unread=d.filter(n=>!n.is_read).length;
  $('bellCount').textContent=unread;$('bellCount').classList.toggle('hidden',unread===0);
  $('notificationList').innerHTML=d.length?d.map(n=>`<div class="notification-item ${n.is_read?'':'unread'}" data-nid="${n.id}" data-tid="${n.ticket_id||''}">
    <b>${esc(n.title)}</b><div>${esc(n.message)}</div><small>${fmt(n.created_at)}</small></div>`).join(''):'<div class="empty">Nessuna notifica</div>';
  document.querySelectorAll('[data-nid]').forEach(x=>x.onclick=async()=>{await update('notifications',`id=eq.${x.dataset.nid}`,{is_read:true});$('notificationPanel').classList.add('hidden');if(x.dataset.tid)detail(+x.dataset.tid);refreshNotifications()});
}
$('bellBtn').onclick=()=>{$('notificationPanel').classList.toggle('hidden');if(!$('notificationPanel').classList.contains('hidden'))refreshNotifications()}
$('markAllRead').onclick=async()=>{await update('notifications',`user_id=eq.${user.id}&is_read=eq.false`,{is_read:true});refreshNotifications()}

function table(rows,it=false){
  if(!rows.length)return'<p>Nessun ticket.</p>';
  return `<div class="tablewrap"><table>
    <thead><tr>
      <th>Ticket</th>
      ${it?'<th>Assegnato a</th><th>Priorità</th>':''}
      ${it?'<th>Richiedente</th>':''}
      <th>Categoria</th>
      <th>Oggetto</th>
      <th>Stato</th>
      <th>Data apertura</th>
    </tr></thead>
    <tbody>${rows.map(x=>`<tr class="click" data-id="${x.id}">
      <td><b>${x.numero_ticket||num(x.id)}</b></td>
      ${it?`<td>${x.assegnato_a?`<span class="assignee">${esc(x.assegnato_a)}</span>`:'<span class="unassigned">NON ASSEGNATO</span>'}</td>
      <td>${priorityBadge(x.priorita)}</td>`:''}
      ${it?`<td>${esc(x.richiedente_nome||x.richiedente_email)}</td>`:''}
      <td>${esc(x.categoria)}</td>
      <td>${esc(x.oggetto)}</td>
      <td>${badge(x.stato)}</td>
      <td>${fmt(x.created_at)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
function wire(){document.querySelectorAll('[data-id]').forEach(r=>r.onclick=()=>detail(+r.dataset.id))}

async function userHome(){page('Service Desk','Apri una richiesta o controlla i tuoi ticket');const d=await select('tickets',`select=*&richiedente_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc&limit=5`);$('content').innerHTML=`<div class="userhero"><h3>Come possiamo aiutarti?</h3><p>Puoi aprire ticket e vedere solo le tue richieste.</p><button id="openNow" class="primary">Apri un ticket</button></div><div class="panel"><h3>Le tue richieste recenti</h3>${table(d)}</div>`;$('openNow').onclick=()=>nav('new');wire()}
async function home(){if(profile.ruolo!=='IT')return userHome();page('Dashboard','Panoramica del Service Desk');const d=await select('tickets','select=*&order=created_at.desc');$('content').innerHTML=`<div class="metrics"><div class="metric"><span>Da prendere in carico</span><b>${d.filter(x=>!x.assegnato_a && x.stato!=='CHIUSO').length}</b></div><div class="metric"><span>In lavorazione</span><b>${d.filter(x=>x.stato==='IN LAVORAZIONE').length}</b></div><div class="metric"><span>Urgenti</span><b>${d.filter(x=>x.priorita==='URGENTE' && x.stato!=='CHIUSO').length}</b></div><div class="metric"><span>Aperti totali</span><b>${d.filter(x=>x.stato!=='CHIUSO').length}</b></div></div><div class="panel"><h3>Ticket recenti</h3>${table(d.slice(0,8),true)}</div>`;wire()}
function newTicket(){page('Nuovo ticket','Apri una richiesta al team IT');$('content').innerHTML=`<div class="panel"><form id="ticketForm" class="formgrid"><label>Categoria<select id="cat" required><option value="">Seleziona...</option><option>Supporto IT</option><option>Installazioni</option><option>Manutenzioni</option><option>Hardware</option><option>Accessi</option><option>Rete / Wi-Fi</option><option>Movimento persona</option><option>Prenotazione materiale</option><option>Altro</option></select></label><label>Oggetto<input id="sub" required></label><label class="full">Descrizione<textarea id="desc" rows="8" required></textarea></label><div class="full"><button class="primary">Invia ticket</button></div></form><p id="result"></p></div>`;
$('ticketForm').onsubmit=async e=>{e.preventDefault();try{const rows=await insert('tickets',{categoria:$('cat').value,oggetto:$('sub').value.trim(),descrizione:$('desc').value.trim(),stato:'APERTO',priorita:'NORMALE',richiedente_nome:profile.nome,richiedente_email:user.email});const d=rows[0],n=num(d.id);await update('tickets',`id=eq.${d.id}`,{numero_ticket:n});try{
  await api('/functions/v1/telegram-new-ticket',{
    method:'POST',
    body:{ticket_id:d.id}
  });
}catch(e){console.warn('Telegram non inviato:',e.message)}await insert('ticket_history',{ticket_id:d.id,evento:'Ticket creato',autore:profile.nome},false);e.target.reset();$('result').textContent=`Ticket ${n} creato.`;toast('Ticket creato');refreshNotifications()}catch(err){$('result').textContent=err.message}}}
async function mine(){page('I miei ticket','Storico delle tue richieste');const d=await select('tickets',`select=*&richiedente_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc`);$('content').innerHTML=`<div class="panel">${table(d)}</div>`;wire()}
async function it(){if(profile.ruolo!=='IT')return userHome();page('Gestione IT','Tutti i ticket');const d=await select('tickets','select=*&order=created_at.desc');$('content').innerHTML=`<div class="panel">${table(d,true)}</div>`;wire()}
async function calendar(){if(profile.ruolo!=='IT')return userHome();page('Calendario','Appuntamenti collegati ai ticket');const d=await select('appointments','select=*,tickets(numero_ticket,oggetto,richiedente_nome)&order=start_at.asc');$('content').innerHTML=`<div class="panel"><h3>Appuntamenti</h3>${d.length?d.map(a=>`<div class="appointment"><b>${fmt(a.start_at)} • ${esc(a.modalita)}</b><div>${esc(a.tickets?.numero_ticket||'')} — ${esc(a.tickets?.oggetto||'')}</div><small>${esc(a.tickets?.richiedente_nome||'')} • ${a.durata_minuti} min</small></div>`).join(''):'<p>Nessun appuntamento.</p>'}</div>`}
function placeholder(k){if(profile.ruolo!=='IT')return userHome();const m={movimenti:['Movimenti','Ingressi, uscite, cambio postazione e sede.'],prenotazioni:['Prenotazioni','Materiale, calendario e verbale di consegna.'],censimento:['Censimento','Inventario asset e storico.']};page(...m[k]);$('content').innerHTML=`<div class="panel"><h3>${m[k][0]}</h3><p>${m[k][1]}</p><span class="badge">Prossima fase</span></div>`}

async function detail(id){
page('Dettaglio ticket','Conversazione e avanzamento');
const rows=await select('tickets',`select=*&id=eq.${id}`);
if(!rows.length)return;
const t=rows[0];
if(profile.ruolo!=='IT'&&t.richiedente_email!==user.email)return toast('Non autorizzato');

let ap=[];
try{ap=await select('appointments',`select=*&ticket_id=eq.${id}&order=start_at.desc`)}catch{}

const apHtml = ap.length ? `<div class="appointment"><b>Appuntamento</b>${ap.map(a=>{
  const st=a.status||'PROPOSTO';
  const statusLabel=st==='CONFERMATO'?'Confermato':st==='RIFIUTATO'?'Da riprogrammare':'In attesa di conferma';
  const action=(profile.ruolo!=='IT' && st==='PROPOSTO') ? `
    <div class="appointment-actions">
      <button class="primary ap-confirm" data-apid="${a.id}">Conferma</button>
      <button class="ghost ap-decline" data-apid="${a.id}">Non posso</button>
    </div>` : '';
  return `<div class="appointment-row">
    <div><strong>${fmt(a.start_at)} • ${esc(a.modalita)} • ${a.durata_minuti} min</strong></div>
    ${a.note?`<div class="appointment-note">${esc(a.note)}</div>`:''}
    <span class="appointment-status ${st.toLowerCase()}">${statusLabel}</span>
    ${action}
  </div>`;
}).join('')}</div>` : '';

$('content').innerHTML=`<div class="panel">
  <span class="badge">${t.numero_ticket||num(t.id)}</span>
  <h3>${esc(t.oggetto)}</h3>
  <p>${esc(t.categoria)} • ${esc(t.richiedente_nome||t.richiedente_email)} • ${fmt(t.created_at)}</p>
  ${badge(t.stato)}
  <p>${esc(t.descrizione)}</p>
  ${apHtml}
</div>

${profile.ruolo==='IT'?`<div class="panel">
  <div class="it-management-head">
    <div>
      <h3>Gestione IT</h3>
      <p class="muted-line">Assegna il ticket, definisci la priorità e aggiorna lo stato.</p>
    </div>
    ${!t.assegnato_a?'<button id="takeTicket" class="primary">Prendi in carico</button>':''}
  </div>
  <div class="formgrid">
    <label>Stato<select id="st"><option>APERTO</option><option>IN LAVORAZIONE</option><option>IN ATTESA</option><option>CHIUSO</option></select></label>
    <label>Priorità<select id="priority"><option>BASSA</option><option>NORMALE</option><option>ALTA</option><option>URGENTE</option></select></label>
    <label class="full">Assegnato a<input id="ass"></label>
  </div>
  <button id="saveTicket" class="primary">Salva gestione</button>
</div>
<div class="panel">
  <h3>Fissa appuntamento</h3>
  <form id="apptForm" class="formgrid">
    <label>Data e ora<input id="apptStart" type="datetime-local" required></label>
    <label>Durata<select id="apptDur"><option>15</option><option selected>30</option><option>45</option><option>60</option></select></label>
    <label>Modalità<select id="apptMode"><option>Presso IT</option><option>Alla postazione utente</option><option>Remoto</option><option>Sala / sede</option></select></label>
    <label>Note<input id="apptNote"></label>
    <div class="full"><button class="primary">Invia proposta appuntamento</button></div>
  </form>
</div>`:''}

<div class="panel">
  <h3>Commenti</h3>
  <div id="comments"></div>
  <form id="commentForm">
    <label>Commento<textarea id="ct" rows="3" required></textarea></label>
    ${profile.ruolo==='IT'?'<label><input id="internal" type="checkbox" style="width:auto"> Nota interna IT</label>':''}
    <button class="primary">Invia commento</button>
  </form>
</div>

${profile.ruolo==='IT'?`<div class="panel">
  <h3>Checklist IT</h3>
  <div id="checks"></div>
  <form id="checkForm">
    <label>Nuova attività<input id="checkText"></label>
    <button class="secondary">Aggiungi</button>
  </form>
</div>`:''}`;

if(profile.ruolo==='IT'){
  $('st').value=t.stato;
  $('priority').value=t.priorita||'NORMALE';
  $('ass').value=t.assegnato_a||'';

  $('saveTicket').onclick=async()=>{
    const stato=$('st').value;
    await update('tickets',`id=eq.${id}`,{
      stato,
      assegnato_a:$('ass').value.trim()||null,
      priorita:$('priority').value,
      closed_at:stato==='CHIUSO'?new Date().toISOString():null
    });
    toast('Aggiornato');
    detail(id);
    refreshNotifications();
  };

  if($('takeTicket')){
    $('takeTicket').onclick=async()=>{
      await update('tickets',`id=eq.${id}`,{
        stato:'IN LAVORAZIONE',
        assegnato_a:profile.nome,
        priorita:t.priorita||'NORMALE'
      });
      toast('Ticket preso in carico');
      detail(id);
      refreshNotifications();
    };
  }

  $('apptForm').onsubmit=async e=>{
    e.preventDefault();
    const start=$('apptStart').value;
    await insert('appointments',{
      ticket_id:id,
      start_at:new Date(start).toISOString(),
      durata_minuti:+$('apptDur').value,
      modalita:$('apptMode').value,
      note:$('apptNote').value.trim()||null,
      created_by:user.id,
      status:'PROPOSTO'
    },false);
    await update('tickets',`id=eq.${id}`,{stato:'IN ATTESA'});
    toast('Proposta appuntamento inviata');
    detail(id);
    refreshNotifications();
  };
}

// USER: conferma / rifiuta proposta appuntamento
document.querySelectorAll('.ap-confirm').forEach(b=>b.onclick=async()=>{
  await update('appointments',`id=eq.${+b.dataset.apid}`,{
    status:'CONFERMATO',
    confirmed_at:new Date().toISOString(),
    confirmed_by:user.id
  });
  toast('Appuntamento confermato');
  detail(id);
  refreshNotifications();
});
document.querySelectorAll('.ap-decline').forEach(b=>b.onclick=async()=>{
  await update('appointments',`id=eq.${+b.dataset.apid}`,{
    status:'RIFIUTATO',
    confirmed_at:new Date().toISOString(),
    confirmed_by:user.id
  });
  toast('Segnalato: appuntamento da riprogrammare');
  detail(id);
  refreshNotifications();
});

async function comments(){
  const d=await select('comments',`select=*&ticket_id=eq.${id}&order=created_at.asc`);
  const v=profile.ruolo==='IT'?d:d.filter(x=>!x.nota_interna);
  $('comments').innerHTML=v.length?v.map(x=>`<div class="comment ${x.nota_interna?'internal':''}">
    <b>${esc(x.autore)}${x.nota_interna?' • Nota interna':''}</b>
    <small style="float:right">${fmt(x.created_at)}</small>
    <p>${esc(x.testo)}</p>
  </div>`).join(''):'<p>Nessun commento.</p>';
}
$('commentForm').onsubmit=async e=>{
  e.preventDefault();
  const txt=$('ct').value.trim();
  const internal=profile.ruolo==='IT'&&$('internal').checked;
  await insert('comments',{
    ticket_id:id,
    autore:profile.nome,
    autore_email:user.email,
    testo:txt,
    nota_interna:internal
  },false);
  $('ct').value='';
  comments();
  refreshNotifications();
};

if(profile.ruolo==='IT'){
  async function checks(){
    const d=await select('checklist_items',`select=*&ticket_id=eq.${id}&order=id.asc`);
    $('checks').innerHTML=d.length?d.map(x=>`<label class="check">
      <input type="checkbox" data-c="${x.id}" ${x.completato?'checked':''}>
      <span>${esc(x.testo)}</span>
    </label>`).join(''):'<p>Nessuna attività.</p>';
    document.querySelectorAll('[data-c]').forEach(c=>c.onchange=()=>update('checklist_items',`id=eq.${+c.dataset.c}`,{
      completato:c.checked,
      completed_at:c.checked?new Date().toISOString():null,
      completed_by:c.checked?profile.nome:null
    }));
  }
  $('checkForm').onsubmit=async e=>{
    e.preventDefault();
    if(!$('checkText').value.trim())return;
    await insert('checklist_items',{ticket_id:id,testo:$('checkText').value.trim()},false);
    $('checkText').value='';
    checks();
  };
  checks();
}
comments();
}
function nav(v){if(profile?.ruolo!=='IT'&&!['new','mine'].includes(v))return userHome();if(v==='home')home();else if(v==='new')newTicket();else if(v==='mine')mine();else if(v==='it')it();else if(v==='calendar')calendar();else placeholder(v)}
async function boot(){const raw=localStorage.getItem('archea_sd_session');if(raw){try{session=JSON.parse(raw);user=await api('/auth/v1/user')}catch{clear()}}if(!user){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}const p=await select('profiles',`select=*&id=eq.${user.id}`);if(!p.length){clear();$('loginErr').textContent='Profilo non trovato';return}profile=p[0];$('who').textContent=profile.nome||user.email;$('role').textContent=profile.ruolo;$('userNav').classList.toggle('hidden',profile.ruolo==='IT');$('itNav').classList.toggle('hidden',profile.ruolo!=='IT');$('login').classList.add('hidden');$('app').classList.remove('hidden');profile.ruolo==='IT'?home():userHome();refreshNotifications();setInterval(refreshNotifications,30000)}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginErr').textContent='';try{const d=await api('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email:$('email').value.trim(),password:$('password').value}});save(d);user=d.user;await boot()}catch(err){$('loginErr').textContent=err.message}}
$('logout').onclick=()=>{clear();location.reload()};document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>nav(b.dataset.view));boot();
