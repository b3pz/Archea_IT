
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
function save(s){
  session=s;
  localStorage.setItem('archea_sd_session',JSON.stringify(s));
}
function clear(){
  session=user=profile=null;
  localStorage.removeItem('archea_sd_session');
}

let refreshPromise=null;

async function refreshSession(){
  if(refreshPromise) return refreshPromise;

  refreshPromise=(async()=>{
    try{
      if(!session?.refresh_token) throw new Error('Refresh token mancante');

      const r=await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',
        headers:{
          'apikey':KEY,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({refresh_token:session.refresh_token})
      });

      const tx=await r.text();
      let d=null;
      try{d=tx?JSON.parse(tx):null}catch{d=tx}

      if(!r.ok || !d?.access_token){
        throw new Error((d&&(d.msg||d.message||d.error_description||d.error))||`Refresh HTTP ${r.status}`);
      }

      save(d);
      user=d.user||user;
      return d;
    }catch(err){
      clear();
      throw err;
    }finally{
      refreshPromise=null;
    }
  })();

  return refreshPromise;
}

function showSessionExpired(){
  const login=$('login'), appEl=$('app');
  if(appEl) appEl.classList.add('hidden');
  if(login) login.classList.remove('hidden');
  if($('loginErr')){
    $('loginErr').textContent='La sessione è scaduta. Accedi di nuovo: il ticket che stavi compilando è stato conservato.';
  }
}

async function api(path,{method='GET',body=null,auth=true,headers={},_retry=true}={}){
  const h={'apikey':KEY,'Content-Type':'application/json',...headers};
  if(auth&&session?.access_token) h.Authorization='Bearer '+session.access_token;

  const r=await fetch(BASE+path,{
    method,
    headers:h,
    body:body?JSON.stringify(body):null
  });

  const tx=await r.text();
  let d=null;
  try{d=tx?JSON.parse(tx):null}catch{d=tx}

  const msg=typeof d==='object'&&d
    ? String(d.msg||d.message||d.error_description||d.error||'')
    : String(d||'');

  const authExpired=r.status===401 || /jwt expired|token.*expired|invalid jwt/i.test(msg);

  if(auth && _retry && authExpired && session?.refresh_token){
    try{
      await refreshSession();
      return api(path,{method,body,auth,headers,_retry:false});
    }catch(refreshErr){
      showSessionExpired();
      throw new Error('Sessione scaduta. Accedi di nuovo.');
    }
  }

  if(!r.ok){
    throw new Error((d&&(d.msg||d.message||d.error_description||d.error))||`HTTP ${r.status}`);
  }

  return d;
}

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

function table(rows,it=false,quick=false){
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
      ${it&&quick?'<th></th>':''}
    </tr></thead>
    <tbody>${rows.map(x=>`<tr class="${quick?'':'click'}" ${quick?'':`data-id="${x.id}"`}>
      <td><b class="ticket-link" data-open="${x.id}">${x.numero_ticket||num(x.id)}</b></td>
      ${it?`<td>${x.assegnato_a?`<span class="assignee">${esc(x.assegnato_a)}</span>`:'<span class="unassigned">NON ASSEGNATO</span>'}</td>
      <td>${priorityBadge(x.priorita)}</td>`:''}
      ${it?`<td>${esc(x.richiedente_nome||x.richiedente_email)}</td>`:''}
      <td>${esc(x.categoria)}</td>
      <td>${esc(x.oggetto)}</td>
      <td>${badge(x.stato)}</td>
      <td>${fmt(x.created_at)}</td>
      ${it&&quick?`<td class="row-actions">${!x.assegnato_a&&x.stato!=='CHIUSO'?`<button class="secondary compact take-row" data-take="${x.id}">Prendi in carico</button>`:''}</td>`:''}
    </tr>`).join('')}</tbody>
  </table></div>`;
}
function wire(){
  document.querySelectorAll('[data-id]').forEach(r=>r.onclick=()=>detail(+r.dataset.id));
  document.querySelectorAll('[data-open]').forEach(r=>r.onclick=e=>{e.stopPropagation();detail(+r.dataset.open)});
}
function dateOnly(d){return d?new Intl.DateTimeFormat('it-IT',{dateStyle:'medium'}).format(new Date(d+'T12:00:00')):'—'}
function bookingStatusBadge(s){
  const cls={
    'RICHIESTA':'book-request',
    'DA VERIFICARE':'book-check',
    'CONFERMATA':'book-confirmed',
    'CONSEGNATA':'book-delivered',
    'RESTITUITA':'book-returned'
  }[s]||'';
  return `<span class="badge ${cls}">${esc(s||'RICHIESTA')}</span>`;
}
function currentITName(){return profile?.nome||user?.email||'IT'}


async function userHome(){page('Service Desk','Apri una richiesta o controlla i tuoi ticket');const d=await select('tickets',`select=*&richiedente_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc&limit=5`);$('content').innerHTML=`<div class="userhero"><h3>Come possiamo aiutarti?</h3><p>Puoi aprire ticket e vedere solo le tue richieste.</p><button id="openNow" class="primary">Apri un ticket</button></div><div class="panel"><h3>Le tue richieste recenti</h3>${table(d)}</div>`;$('openNow').onclick=()=>nav('new');wire()}
async function home(){if(profile.ruolo!=='IT')return userHome();page('Dashboard','Panoramica del Service Desk');const d=await select('tickets','select=*&order=created_at.desc');$('content').innerHTML=`<div class="metrics"><div class="metric"><span>Da prendere in carico</span><b>${d.filter(x=>!x.assegnato_a && x.stato!=='CHIUSO').length}</b></div><div class="metric"><span>In lavorazione</span><b>${d.filter(x=>x.stato==='IN LAVORAZIONE').length}</b></div><div class="metric"><span>Urgenti</span><b>${d.filter(x=>x.priorita==='URGENTE' && x.stato!=='CHIUSO').length}</b></div><div class="metric"><span>Aperti totali</span><b>${d.filter(x=>x.stato!=='CHIUSO').length}</b></div></div><div class="panel"><h3>Ticket recenti</h3>${table(d.slice(0,8),true)}</div>`;wire()}
function newTicket(){
  page('Nuovo ticket','Apri una richiesta al team IT');
  $('content').innerHTML=`<div class="panel">
    <form id="ticketForm" class="formgrid">
      <label>Categoria<select id="cat" required>
        <option value="">Seleziona...</option>
        <option>Supporto IT</option>
        <option>Installazioni</option>
        <option>Manutenzioni</option>
        <option>Hardware</option>
        <option>Accessi</option>
        <option>Rete / Wi-Fi</option>
        <option>Movimento persona</option>
        <option>Prenotazione materiale</option>
        <option>Altro</option>
      </select></label>
      <label>Oggetto<input id="sub" required></label>

      <div id="bookingFields" class="full booking-fields hidden">
        <div class="section-title">
          <h3>Richiesta materiale</h3>
          <p>Indica ciò che ti serve. La disponibilità sarà confermata dal reparto IT.</p>
        </div>
        <div class="formgrid">
          <label>Materiale<select id="matType">
            <option value="">Seleziona...</option>
            <option>Matterport</option>
            <option>iPad</option>
            <option>Laptop Dell</option>
            <option>MacBook</option>
            <option>Altro</option>
          </select></label>
          <label>Quantità<input id="matQty" type="number" min="1" value="1"></label>
          <label>Data ritiro<input id="pickupDate" type="date"></label>
          <label>Restituzione prevista<input id="returnDate" type="date"></label>
          <label>Sede<input id="bookSite" placeholder="Firenze, Milano, Roma..."></label>
          <label>Motivo / progetto<input id="bookReason"></label>
          <label class="full">Accessori richiesti<input id="bookAccessories" placeholder="Alimentatore, mouse, adattatori..."></label>
          <label class="full">Note materiale<textarea id="bookNotes" rows="3"></textarea></label>
        </div>
        <div class="info-box">La richiesta non garantisce automaticamente la disponibilità. Il reparto IT la verificherà e assegnerà il materiale preciso.</div>
      </div>

      <label class="full">Descrizione<textarea id="desc" rows="7" required></textarea></label>
      <div class="full"><button class="primary">Invia ticket</button></div>
    </form>
    <p id="result"></p>
  </div>`;

  const DRAFT_KEY='archea_ticket_draft';
  const bookingIds=['matType','matQty','pickupDate','returnDate','bookSite','bookReason','bookAccessories','bookNotes'];

  const toggleBooking=()=>{
    const on=$('cat').value==='Prenotazione materiale';
    $('bookingFields').classList.toggle('hidden',!on);
    bookingIds.forEach(id=>{
      if($(id)) $(id).required = on && ['matType','pickupDate','returnDate','bookSite','bookReason'].includes(id);
    });
  };

  try{
    const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    if(draft){
      $('cat').value=draft.categoria||'';
      $('sub').value=draft.oggetto||'';
      $('desc').value=draft.descrizione||'';
      bookingIds.forEach(id=>{if($(id)&&draft[id]!==undefined)$(id).value=draft[id]});
    }
  }catch{}
  toggleBooking();

  const saveDraft=()=>{
    const d={
      categoria:$('cat').value,
      oggetto:$('sub').value,
      descrizione:$('desc').value,
      saved_at:new Date().toISOString()
    };
    bookingIds.forEach(id=>{if($(id))d[id]=$(id).value});
    localStorage.setItem(DRAFT_KEY,JSON.stringify(d));
  };

  ['cat','sub','desc',...bookingIds].forEach(id=>{
    if(!$(id))return;
    $(id).addEventListener('input',saveDraft);
    $(id).addEventListener('change',()=>{if(id==='cat')toggleBooking();saveDraft()});
  });

  $('ticketForm').onsubmit=async e=>{
    e.preventDefault();
    $('result').textContent='';

    try{
      const isBooking=$('cat').value==='Prenotazione materiale';

      if(isBooking && $('returnDate').value < $('pickupDate').value){
        throw new Error('La data di restituzione non può essere precedente al ritiro.');
      }

      const rows=await insert('tickets',{
        categoria:$('cat').value,
        oggetto:$('sub').value.trim(),
        descrizione:$('desc').value.trim(),
        stato:'APERTO',
        priorita:'NORMALE',
        richiedente_nome:profile.nome,
        richiedente_email:user.email
      });

      const d=rows[0],n=num(d.id);
      await update('tickets',`id=eq.${d.id}`,{numero_ticket:n});

      if(isBooking){
        await insert('material_bookings',{
          ticket_id:d.id,
          requester_name:profile.nome,
          requester_email:user.email,
          material_type:$('matType').value,
          quantity:+$('matQty').value||1,
          pickup_date:$('pickupDate').value,
          planned_return_date:$('returnDate').value,
          site:$('bookSite').value.trim(),
          reason:$('bookReason').value.trim(),
          requested_accessories:$('bookAccessories').value.trim()||null,
          requester_notes:$('bookNotes').value.trim()||null,
          status:'RICHIESTA'
        },false);
      }

      try{
        await api('/functions/v1/telegram-new-ticket',{
          method:'POST',
          body:{ticket_id:d.id}
        });
      }catch(e){
        console.warn('Telegram non inviato:',e.message);
      }

      await insert('ticket_history',{
        ticket_id:d.id,
        evento:isBooking?'Ticket + richiesta materiale creati':'Ticket creato',
        autore:profile.nome
      },false);

      localStorage.removeItem(DRAFT_KEY);
      e.target.reset();
      toggleBooking();
      $('result').textContent=`Ticket ${n} creato.`;
      toast('Ticket creato');
      refreshNotifications();
    }catch(err){
      saveDraft();
      $('result').textContent=err.message;
    }
  };
}
async function mine(){page('I miei ticket','Storico delle tue richieste');const d=await select('tickets',`select=*&richiedente_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc`);$('content').innerHTML=`<div class="panel">${table(d)}</div>`;wire()}
async function it(){
  if(profile.ruolo!=='IT')return userHome();
  page('Gestione IT','Coda operativa del reparto');

  const d=await select('tickets','select=*&order=created_at.desc');
  let filter='OPEN';
  let search='';
  let category='';
  let order='old';

  const categories=[...new Set(d.map(x=>x.categoria).filter(Boolean))].sort();

  $('content').innerHTML=`
    <div class="queue-stats">
      <button class="queue-card active" data-filter="OPEN"><span>Aperti</span><b>${d.filter(x=>x.stato!=='CHIUSO').length}</b></button>
      <button class="queue-card" data-filter="UNASSIGNED"><span>Non assegnati</span><b>${d.filter(x=>!x.assegnato_a&&x.stato!=='CHIUSO').length}</b></button>
      <button class="queue-card" data-filter="MINE"><span>I miei</span><b>${d.filter(x=>x.assegnato_a===currentITName()&&x.stato!=='CHIUSO').length}</b></button>
      <button class="queue-card" data-filter="URGENT"><span>Urgenti</span><b>${d.filter(x=>x.priorita==='URGENTE'&&x.stato!=='CHIUSO').length}</b></button>
      <button class="queue-card" data-filter="WAITING"><span>In attesa</span><b>${d.filter(x=>x.stato==='IN ATTESA').length}</b></button>
    </div>

    <div class="panel">
      <div class="queue-toolbar">
        <input id="queueSearch" placeholder="Cerca ticket, nome, oggetto...">
        <select id="queueCategory">
          <option value="">Tutte le categorie</option>
          ${categories.map(c=>`<option>${esc(c)}</option>`).join('')}
        </select>
        <select id="queueOrder">
          <option value="old">Più vecchi prima</option>
          <option value="new">Più recenti prima</option>
          <option value="priority">Priorità</option>
        </select>
      </div>
      <div id="queueTable"></div>
    </div>`;

  const rank={URGENTE:4,ALTA:3,NORMALE:2,BASSA:1};

  const render=()=>{
    let rows=d.filter(x=>{
      if(filter==='OPEN' && x.stato==='CHIUSO')return false;
      if(filter==='UNASSIGNED' && (x.assegnato_a||x.stato==='CHIUSO'))return false;
      if(filter==='MINE' && (x.assegnato_a!==currentITName()||x.stato==='CHIUSO'))return false;
      if(filter==='URGENT' && (x.priorita!=='URGENTE'||x.stato==='CHIUSO'))return false;
      if(filter==='WAITING' && x.stato!=='IN ATTESA')return false;
      if(category && x.categoria!==category)return false;
      if(search){
        const hay=`${x.numero_ticket||''} ${x.richiedente_nome||''} ${x.richiedente_email||''} ${x.oggetto||''} ${x.categoria||''}`.toLowerCase();
        if(!hay.includes(search.toLowerCase()))return false;
      }
      return true;
    });

    rows=[...rows].sort((a,b)=>{
      if(order==='priority'){
        return (rank[b.priorita||'NORMALE']-rank[a.priorita||'NORMALE']) || new Date(a.created_at)-new Date(b.created_at);
      }
      return order==='new'
        ? new Date(b.created_at)-new Date(a.created_at)
        : new Date(a.created_at)-new Date(b.created_at);
    });

    $('queueTable').innerHTML=table(rows,true,true);
    wire();

    document.querySelectorAll('[data-take]').forEach(btn=>{
      btn.onclick=async e=>{
        e.stopPropagation();
        const id=+btn.dataset.take;
        await update('tickets',`id=eq.${id}`,{
          stato:'IN LAVORAZIONE',
          assegnato_a:currentITName()
        });
        toast('Ticket preso in carico');
        return it();
      };
    });
  };

  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{
    filter=b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    render();
  });
  $('queueSearch').oninput=e=>{search=e.target.value;render()};
  $('queueCategory').onchange=e=>{category=e.target.value;render()};
  $('queueOrder').onchange=e=>{order=e.target.value;render()};
  render();
}
async function calendar(){if(profile.ruolo!=='IT')return userHome();page('Calendario','Appuntamenti collegati ai ticket');const d=await select('appointments','select=*,tickets(numero_ticket,oggetto,richiedente_nome)&order=start_at.asc');$('content').innerHTML=`<div class="panel"><h3>Appuntamenti</h3>${d.length?d.map(a=>`<div class="appointment"><b>${fmt(a.start_at)} • ${esc(a.modalita)}</b><div>${esc(a.tickets?.numero_ticket||'')} — ${esc(a.tickets?.oggetto||'')}</div><small>${esc(a.tickets?.richiedente_nome||'')} • ${a.durata_minuti} min</small></div>`).join(''):'<p>Nessun appuntamento.</p>'}</div>`}
async function bookings(){
  if(profile.ruolo!=='IT')return userHome();
  page('Prenotazioni','Richieste materiale e verbali di consegna');

  const rows=await select('material_bookings',
    'select=*,tickets(numero_ticket,oggetto,stato,priorita)&order=created_at.desc');

  const counts={
    request:rows.filter(x=>x.status==='RICHIESTA').length,
    check:rows.filter(x=>x.status==='DA VERIFICARE').length,
    confirmed:rows.filter(x=>x.status==='CONFERMATA').length,
    delivered:rows.filter(x=>x.status==='CONSEGNATA').length
  };

  $('content').innerHTML=`
    <div class="metrics booking-metrics">
      <div class="metric"><span>Richieste</span><b>${counts.request}</b></div>
      <div class="metric"><span>Da verificare</span><b>${counts.check}</b></div>
      <div class="metric"><span>Confermate</span><b>${counts.confirmed}</b></div>
      <div class="metric"><span>Consegnate</span><b>${counts.delivered}</b></div>
    </div>
    <div class="panel">
      <div class="queue-toolbar">
        <input id="bookingSearch" placeholder="Cerca persona, ticket, materiale, asset...">
        <select id="bookingStatusFilter">
          <option value="">Tutti gli stati</option>
          <option>RICHIESTA</option>
          <option>DA VERIFICARE</option>
          <option>CONFERMATA</option>
          <option>CONSEGNATA</option>
          <option>RESTITUITA</option>
        </select>
      </div>
      <div id="bookingsList"></div>
    </div>`;

  const render=()=>{
    const q=$('bookingSearch').value.toLowerCase().trim();
    const st=$('bookingStatusFilter').value;
    const filtered=rows.filter(x=>{
      if(st&&x.status!==st)return false;
      if(q){
        const h=`${x.requester_name||''} ${x.requester_email||''} ${x.material_type||''} ${x.asset_code||''} ${x.asset_model||''} ${x.tickets?.numero_ticket||''}`.toLowerCase();
        if(!h.includes(q))return false;
      }
      return true;
    });

    $('bookingsList').innerHTML=filtered.length?filtered.map(b=>`
      <div class="booking-card" data-booking="${b.id}">
        <div>
          <div class="booking-card-title">
            <b>${esc(b.material_type)} × ${b.quantity}</b>
            ${bookingStatusBadge(b.status)}
          </div>
          <div class="booking-meta">
            <span>${esc(b.requester_name||b.requester_email)}</span>
            <span>${esc(b.tickets?.numero_ticket||'')}</span>
            <span>${dateOnly(b.pickup_date)} → ${dateOnly(b.planned_return_date)}</span>
            <span>${esc(b.site)}</span>
          </div>
          ${b.asset_code?`<div class="assigned-asset">Asset assegnato: <b>${esc(b.asset_code)}</b>${b.asset_model?` — ${esc(b.asset_model)}`:''}</div>`:''}
        </div>
        <button class="secondary">Gestisci</button>
      </div>`).join(''):'<div class="empty">Nessuna prenotazione.</div>';

    document.querySelectorAll('[data-booking]').forEach(x=>x.onclick=()=>bookingDetail(+x.dataset.booking));
  };

  $('bookingSearch').oninput=render;
  $('bookingStatusFilter').onchange=render;
  render();
}

async function bookingDetail(id){
  if(profile.ruolo!=='IT')return userHome();
  const rows=await select('material_bookings',`select=*,tickets(numero_ticket,oggetto,stato,priorita,richiedente_nome,richiedente_email)&id=eq.${id}`);
  if(!rows.length)return;
  const b=rows[0];

  page('Prenotazione materiale',b.tickets?.numero_ticket||'');

  $('content').innerHTML=`
    <div class="panel booking-summary">
      <div class="it-management-head">
        <div>
          <h3>${esc(b.material_type)} × ${b.quantity}</h3>
          <p class="muted-line">${esc(b.requester_name||b.requester_email)} • ${esc(b.site)}</p>
        </div>
        ${bookingStatusBadge(b.status)}
      </div>
      <div class="booking-grid">
        <div><span>Ritiro</span><b>${dateOnly(b.pickup_date)}</b></div>
        <div><span>Restituzione prevista</span><b>${dateOnly(b.planned_return_date)}</b></div>
        <div><span>Motivo / progetto</span><b>${esc(b.reason)}</b></div>
        <div><span>Accessori richiesti</span><b>${esc(b.requested_accessories||'—')}</b></div>
      </div>
      ${b.requester_notes?`<div class="info-box"><b>Note utente:</b> ${esc(b.requester_notes)}</div>`:''}
      <button id="openBookingTicket" class="ghost">Apri ticket collegato</button>
    </div>

    <div class="panel">
      <h3>Gestione IT materiale</h3>
      <div class="formgrid">
        <label>Stato prenotazione<select id="bookStatus">
          <option>RICHIESTA</option>
          <option>DA VERIFICARE</option>
          <option>CONFERMATA</option>
          <option>CONSEGNATA</option>
          <option>RESTITUITA</option>
        </select></label>
        <label>Codice asset<input id="assetCode" value="${esc(b.asset_code||'')}" placeholder="es. A0345"></label>
        <label>Descrizione / modello<input id="assetModel" value="${esc(b.asset_model||'')}" placeholder="es. Dell Precision 5680"></label>
        <label>Seriale<input id="assetSerial" value="${esc(b.asset_serial||'')}"></label>
        <label class="full">Accessori consegnati<input id="deliveredAccessories" value="${esc(b.delivered_accessories||'')}" placeholder="Alimentatore, mouse, adattatore..."></label>
        <label class="full">Note IT<textarea id="bookItNotes" rows="3">${esc(b.it_notes||'')}</textarea></label>
      </div>
      <div class="button-row">
        <button id="saveBooking" class="primary">Salva prenotazione</button>
        <button id="printDelivery" class="secondary">Genera verbale / PDF</button>
      </div>
      <p class="muted-line">Il verbale viene generato al momento per stampa o salvataggio PDF. Non viene archiviato nel database.</p>
    </div>`;

  $('bookStatus').value=b.status||'RICHIESTA';
  $('openBookingTicket').onclick=()=>detail(b.ticket_id);

  $('saveBooking').onclick=async()=>{
    const status=$('bookStatus').value;
    await update('material_bookings',`id=eq.${id}`,{
      status,
      asset_code:$('assetCode').value.trim()||null,
      asset_model:$('assetModel').value.trim()||null,
      asset_serial:$('assetSerial').value.trim()||null,
      delivered_accessories:$('deliveredAccessories').value.trim()||null,
      it_notes:$('bookItNotes').value.trim()||null,
      prepared_by:currentITName(),
      updated_at:new Date().toISOString()
    });
    toast('Prenotazione aggiornata');
    bookingDetail(id);
  };

  $('printDelivery').onclick=async()=>{
    const live={
      ...b,
      status:$('bookStatus').value,
      asset_code:$('assetCode').value.trim(),
      asset_model:$('assetModel').value.trim(),
      asset_serial:$('assetSerial').value.trim(),
      delivered_accessories:$('deliveredAccessories').value.trim(),
      it_notes:$('bookItNotes').value.trim(),
      prepared_by:currentITName()
    };
    if(!live.asset_code){
      return toast('Inserisci prima il codice asset');
    }
    printDeliverySheet(live);
  };
}

function printDeliverySheet(b){
  const w=window.open('','_blank','width=900,height=1000');
  if(!w)return toast('Il browser ha bloccato la finestra di stampa');

  const ticket=b.tickets?.numero_ticket||'';
  const html=`<!doctype html>
  <html lang="it"><head><meta charset="utf-8"><title>Verbale ${esc(ticket)}</title>
  <style>
    @page{size:A4;margin:18mm}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:12px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:24px}
    .logo{width:190px}.title{text-align:right}.title h1{font-size:19px;margin:0 0 6px}.muted{color:#666}
    .section{margin:22px 0}.section h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #bbb;padding-bottom:6px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 30px}
    .field span{display:block;color:#666;font-size:10px;text-transform:uppercase;margin-bottom:3px}.field b{font-size:12px}
    .box{border:1px solid #bbb;padding:12px;min-height:44px}
    .signatures{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:65px}
    .signature{border-top:1px solid #111;padding-top:7px;text-align:center}
    footer{position:fixed;bottom:0;left:0;right:0;font-size:9px;color:#777;text-align:center}
    .no-print{margin:0 0 16px;padding:10px;background:#f1f1f1;text-align:center}
    @media print{.no-print{display:none}}
  </style></head><body>
    <div class="no-print">Usa Stampa e scegli “Salva come PDF” oppure stampa direttamente il documento.</div>
    <div class="head">
      <img class="logo" src="${location.href.replace(/[^/]*$/,'')}logo_archea.png">
      <div class="title"><h1>VERBALE DI CONSEGNA MATERIALE</h1><div>${esc(ticket)}</div></div>
    </div>

    <div class="section">
      <h2>Assegnatario</h2>
      <div class="grid">
        <div class="field"><span>Nome</span><b>${esc(b.requester_name||b.requester_email)}</b></div>
        <div class="field"><span>Sede</span><b>${esc(b.site)}</b></div>
        <div class="field"><span>Data consegna / ritiro</span><b>${dateOnly(b.pickup_date)}</b></div>
        <div class="field"><span>Restituzione prevista</span><b>${dateOnly(b.planned_return_date)}</b></div>
        <div class="field"><span>Motivo / progetto</span><b>${esc(b.reason)}</b></div>
        <div class="field"><span>Preparato da IT</span><b>${esc(b.prepared_by||'')}</b></div>
      </div>
    </div>

    <div class="section">
      <h2>Materiale consegnato</h2>
      <div class="grid">
        <div class="field"><span>Tipologia</span><b>${esc(b.material_type)} × ${b.quantity}</b></div>
        <div class="field"><span>Codice asset</span><b>${esc(b.asset_code||'—')}</b></div>
        <div class="field"><span>Modello / descrizione</span><b>${esc(b.asset_model||'—')}</b></div>
        <div class="field"><span>Seriale</span><b>${esc(b.asset_serial||'—')}</b></div>
      </div>
    </div>

    <div class="section"><h2>Accessori</h2><div class="box">${esc(b.delivered_accessories||b.requested_accessories||'Nessun accessorio indicato')}</div></div>
    <div class="section"><h2>Note</h2><div class="box">${esc(b.it_notes||b.requester_notes||'')}</div></div>

    <div class="section">
      <p>Con la firma il destinatario dichiara di aver ricevuto il materiale sopra indicato e si impegna a restituirlo nelle condizioni in cui è stato consegnato, salvo normale usura.</p>
    </div>

    <div class="signatures">
      <div class="signature">Firma assegnatario</div>
      <div class="signature">Firma reparto IT</div>
    </div>

    <footer>Archea Associati — Documento generato da Archea Service Desk — Dipartimento IT</footer>
    <script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script>
  </body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

function placeholder(k){
  if(profile.ruolo!=='IT')return userHome();
  const m={
    movimenti:['Movimenti','Ingressi, uscite, cambio postazione e sede.'],
    censimento:['Censimento','Inventario asset e storico.']
  };
  page(...m[k]);
  $('content').innerHTML=`<div class="panel"><h3>${m[k][0]}</h3><p>${m[k][1]}</p><span class="badge">Prossima fase</span></div>`;
}

async function detail(id){
page('Dettaglio ticket','Conversazione e avanzamento');
const rows=await select('tickets',`select=*&id=eq.${id}`);
if(!rows.length)return;
const t=rows[0];
if(profile.ruolo!=='IT'&&t.richiedente_email!==user.email)return toast('Non autorizzato');

let ap=[];
try{ap=await select('appointments',`select=*&ticket_id=eq.${id}&order=start_at.desc`)}catch{}
let materialBooking=null;
if(t.categoria==='Prenotazione materiale'){
  try{
    const mb=await select('material_bookings',`select=*&ticket_id=eq.${id}`);
    materialBooking=mb[0]||null;
  }catch{}
}


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
  ${materialBooking?`<div class="appointment material-summary">
    <b>Richiesta materiale</b>
    <div class="booking-grid compact-grid">
      <div><span>Materiale</span><b>${esc(materialBooking.material_type)} × ${materialBooking.quantity}</b></div>
      <div><span>Stato</span>${bookingStatusBadge(materialBooking.status)}</div>
      <div><span>Ritiro</span><b>${dateOnly(materialBooking.pickup_date)}</b></div>
      <div><span>Restituzione</span><b>${dateOnly(materialBooking.planned_return_date)}</b></div>
      ${materialBooking.asset_code?`<div><span>Asset assegnato</span><b>${esc(materialBooking.asset_code)}${materialBooking.asset_model?` — ${esc(materialBooking.asset_model)}`:''}</b></div>`:''}
    </div>
    ${profile.ruolo==='IT'?`<button id="manageMaterial" class="secondary compact">Gestisci materiale</button>`:''}
  </div>`:''}
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
  if($('manageMaterial')&&materialBooking){
    $('manageMaterial').onclick=()=>bookingDetail(materialBooking.id);
  }
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
function nav(v){if(profile?.ruolo!=='IT'&&!['new','mine'].includes(v))return userHome();if(v==='home')home();else if(v==='new')newTicket();else if(v==='mine')mine();else if(v==='it')it();else if(v==='calendar')calendar();else if(v==='prenotazioni')bookings();else placeholder(v)}
async function boot(){const raw=localStorage.getItem('archea_sd_session');if(raw){try{session=JSON.parse(raw);user=await api('/auth/v1/user')}catch{clear()}}if(!user){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}const p=await select('profiles',`select=*&id=eq.${user.id}`);if(!p.length){clear();$('loginErr').textContent='Profilo non trovato';return}profile=p[0];$('who').textContent=profile.nome||user.email;$('role').textContent=profile.ruolo;$('userNav').classList.toggle('hidden',profile.ruolo==='IT');$('itNav').classList.toggle('hidden',profile.ruolo!=='IT');$('login').classList.add('hidden');$('app').classList.remove('hidden');profile.ruolo==='IT'?home():userHome();
refreshNotifications();
setInterval(refreshNotifications,30000);
setInterval(async()=>{
  try{
    if(session?.refresh_token) await refreshSession();
  }catch(e){
    console.warn('Refresh sessione fallito:',e.message);
  }
},10*60*1000);
}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginErr').textContent='';try{const d=await api('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email:$('email').value.trim(),password:$('password').value}});save(d);user=d.user;await boot()}catch(err){$('loginErr').textContent=err.message}}
$('logout').onclick=()=>{clear();location.reload()};document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>nav(b.dataset.view));boot();
