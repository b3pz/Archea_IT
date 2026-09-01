
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
function isITRole(){return profile?.ruolo==='IT'||profile?.ruolo==='SUPER_IT'}
function isSuperIT(){return profile?.ruolo==='SUPER_IT'}
function isHR(){return profile?.ruolo==='HR'}
function assetStatusBadge(s){
  const cls={
    'DISPONIBILE':'asset-available',
    'ASSEGNATO':'asset-assigned',
    'PRENOTATO':'asset-booked',
    'IN PRESTITO':'asset-loan',
    'IN MANUTENZIONE':'asset-maint',
    'GUASTO':'asset-broken',
    'DISMESSO':'asset-retired',
    'VENDUTO':'asset-sold',
    'DA VERIFICARE':'asset-check'
  }[s]||'asset-check';
  return `<span class="badge ${cls}">${esc(s||'DA VERIFICARE')}</span>`;
}
function verifyBadge(s){
  const cls={
    'VERIFICATO':'verify-ok',
    'DA VERIFICARE':'verify-warn',
    'DUBBIO':'verify-doubt',
    'NON TROVATO':'verify-missing',
    'ASSEGNAZIONE DA CONFERMARE':'verify-warn'
  }[s]||'verify-warn';
  return `<span class="badge ${cls}">${esc(s||'DA VERIFICARE')}</span>`;
}

function relTime(d){
  if(!d)return '—';
  const s=Math.max(0,Math.floor((Date.now()-new Date(d).getTime())/1000));
  if(s<60)return 'adesso';
  if(s<3600)return `${Math.floor(s/60)} min fa`;
  if(s<86400)return `${Math.floor(s/3600)} h fa`;
  return `${Math.floor(s/86400)} gg fa`;
}
function ageClass(d){
  const h=(Date.now()-new Date(d).getTime())/3600000;
  return h>=72?'age-old':h>=24?'age-mid':'';
}



async function userHome(){page('Service Desk','Apri una richiesta o controlla i tuoi ticket');const d=await select('tickets',`select=*&richiedente_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc&limit=5`);$('content').innerHTML=`<div class="userhero"><h3>Come possiamo aiutarti?</h3><p>Puoi aprire ticket e vedere solo le tue richieste.</p><button id="openNow" class="primary">Apri un ticket</button></div><div class="panel"><h3>Le tue richieste recenti</h3>${table(d)}</div>`;$('openNow').onclick=()=>nav('new');wire()}
async function home(){
  if(!isITRole())return userHome();
  page(isSuperIT()?'Dashboard SUPER IT':'Dashboard','Panoramica operativa del Service Desk');

  const d=await select('tickets','select=*&order=updated_at.desc.nullslast,created_at.desc');

  if(!isSuperIT()){
    $('content').innerHTML=`
      <div class="metrics">
        <div class="metric"><span>Da prendere in carico</span><b>${d.filter(x=>!x.assigned_to&&x.stato!=='CHIUSO').length}</b></div>
        <div class="metric"><span>In lavorazione</span><b>${d.filter(x=>x.stato==='IN LAVORAZIONE').length}</b></div>
        <div class="metric"><span>Urgenti</span><b>${d.filter(x=>x.priorita==='URGENTE'&&x.stato!=='CHIUSO').length}</b></div>
        <div class="metric"><span>Aperti visibili</span><b>${d.filter(x=>x.stato!=='CHIUSO').length}</b></div>
      </div>
      <div class="panel"><h3>Ticket recenti</h3>${table(d.slice(0,10),true)}</div>`;
    wire();
    return;
  }

  const its=await select('profiles','select=id,nome,email,ruolo&ruolo=in.(IT,SUPER_IT)&order=nome.asc');
  const workload=its.map(itp=>({
    nome:itp.nome||itp.email,
    n:d.filter(t=>t.assigned_to===itp.id&&t.stato!=='CHIUSO').length
  }));

  $('content').innerHTML=`
    <div class="metrics">
      <div class="metric"><span>Non assegnati</span><b>${d.filter(x=>!x.assigned_to&&x.stato!=='CHIUSO').length}</b></div>
      <div class="metric"><span>In lavorazione</span><b>${d.filter(x=>x.stato==='IN LAVORAZIONE').length}</b></div>
      <div class="metric"><span>Urgenti</span><b>${d.filter(x=>x.priorita==='URGENTE'&&x.stato!=='CHIUSO').length}</b></div>
      <div class="metric"><span>Senza attività &gt;48h</span><b>${d.filter(x=>x.stato!=='CHIUSO'&&((Date.now()-new Date(x.updated_at||x.created_at))/3600000)>48).length}</b></div>
    </div>
    <div class="dashboard-grid">
      <div class="panel">
        <h3>Carico team IT</h3>
        ${workload.map(w=>`<div class="workload-row"><span>${esc(w.nome)}</span><b>${w.n}</b></div>`).join('')}
      </div>
      <div class="panel">
        <h3>Ticket più vecchi ancora aperti</h3>
        ${table([...d].filter(x=>x.stato!=='CHIUSO').sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).slice(0,6),true)}
      </div>
    </div>`;
  wire();
}
function newTicket(){
  page('Nuovo ticket','Apri una richiesta al team IT');

  $('content').innerHTML=`<div class="panel">
    <form id="ticketForm" class="formgrid">

      ${isITRole()?`<label>Richiedente
        <select id="requesterMode">
          <option value="ME">Me stesso</option>
          <option value="OTHER">Altro utente</option>
        </select>
      </label>
      <label id="requesterEmailWrap" class="hidden">Email richiedente
        <input id="requesterEmail" type="email" placeholder="nome.cognome@archea.it">
      </label>
      <label>Origine
        <select id="origin">
          <option>Portale</option>
          <option>Telefono</option>
          <option>Presenza in IT</option>
          <option>Email</option>
          <option>Altro</option>
        </select>
      </label>
      <label>Sede<input id="ticketSite" placeholder="Firenze, Milano, Roma..."></label>`:''}

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
          <p>La disponibilità verrà verificata dal reparto IT.</p>
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
          <label>Sede<input id="bookSite"></label>
          <label>Motivo / progetto<input id="bookReason"></label>
          <label class="full">Accessori richiesti<input id="bookAccessories"></label>
          <label class="full">Note materiale <span class="optional">(facoltative)</span>
            <textarea id="bookNotes" rows="3"></textarea>
          </label>
        </div>
      </div>

      <label class="full">Descrizione<textarea id="desc" rows="7" required></textarea></label>
      <div class="full"><button class="primary">Invia ticket</button></div>
    </form>
    <p id="result"></p>
  </div>`;

  if(isITRole()){
    $('requesterMode').onchange=()=>{
      const other=$('requesterMode').value==='OTHER';
      $('requesterEmailWrap').classList.toggle('hidden',!other);
      $('requesterEmail').required=other;
    };
  }

  const bookingIds=['matType','matQty','pickupDate','returnDate','bookSite','bookReason','bookAccessories','bookNotes'];
  const toggleBooking=()=>{
    const on=$('cat').value==='Prenotazione materiale';
    $('bookingFields').classList.toggle('hidden',!on);
    bookingIds.forEach(id=>{
      if($(id))$(id).required=on&&['matType','pickupDate','returnDate','bookSite','bookReason'].includes(id);
    });
  };
  $('cat').onchange=toggleBooking;
  toggleBooking();

  $('ticketForm').onsubmit=async e=>{
    e.preventDefault();
    $('result').textContent='';

    try{
      const isBooking=$('cat').value==='Prenotazione materiale';
      if(isBooking&&$('returnDate').value<$('pickupDate').value)
        throw new Error('La restituzione non può essere precedente al ritiro.');

      let requesterEmail=user.email;
      let requesterName=profile.nome;

      if(isITRole()&&$('requesterMode').value==='OTHER'){
        requesterEmail=$('requesterEmail').value.trim().toLowerCase();
        if(!requesterEmail.endsWith('@archea.it'))
          throw new Error('Inserisci una mail aziendale @archea.it.');
        const p=await select('profiles',`select=*&email=eq.${encodeURIComponent(requesterEmail)}`);
        requesterName=p[0]?.nome||requesterEmail;
      }

      const rows=await insert('tickets',{
        categoria:$('cat').value,
        oggetto:$('sub').value.trim(),
        descrizione:$('desc').value.trim(),
        stato:'APERTO',
        priorita:'NORMALE',
        richiedente_nome:requesterName,
        richiedente_email:requesterEmail,
        created_by:user.id,
        created_by_name:profile.nome,
        origine:isITRole()?$('origin').value:'Portale',
        sede:isITRole()?($('ticketSite').value.trim()||null):null
      });

      const d=rows[0],n=num(d.id);
      await update('tickets',`id=eq.${d.id}`,{numero_ticket:n});

      if(isBooking){
        await insert('material_bookings',{
          ticket_id:d.id,
          requester_name:requesterName,
          requester_email:requesterEmail,
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
        await api('/functions/v1/telegram-new-ticket',{method:'POST',body:{ticket_id:d.id}});
      }catch(e){console.warn('Telegram non inviato:',e.message)}

      await insert('ticket_history',{
        ticket_id:d.id,
        evento:isITRole()&&requesterEmail!==user.email
          ?`Ticket creato da ${profile.nome} per conto di ${requesterEmail}`
          :'Ticket creato',
        autore:profile.nome
      },false);

      e.target.reset();
      toggleBooking();
      $('result').textContent=`Ticket ${n} creato.`;
      toast('Ticket creato');
      refreshNotifications();
    }catch(err){
      $('result').textContent=err.message;
    }
  };
}
async function mine(){page('I miei ticket','Storico delle tue richieste');const d=await select('tickets',`select=*&richiedente_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc`);$('content').innerHTML=`<div class="panel">${table(d)}</div>`;wire()}
async function it(){
  if(!isITRole())return userHome();
  page('Gestione IT','Coda operativa del reparto');

  const d=await select('tickets','select=*&order=updated_at.desc.nullslast,created_at.desc');
  const its=await select('profiles','select=id,nome,email,ruolo&ruolo=in.(IT,SUPER_IT)&order=nome.asc');

  let filter='OPEN',search='',category='',assignee='',order='old';

  const categories=[...new Set(d.map(x=>x.categoria).filter(Boolean))].sort();

  $('content').innerHTML=`
    <div class="queue-stats">
      <button class="queue-card active" data-filter="OPEN"><span>Aperti</span><b>${d.filter(x=>x.stato!=='CHIUSO').length}</b></button>
      <button class="queue-card" data-filter="UNASSIGNED"><span>Non assegnati</span><b>${d.filter(x=>!x.assigned_to&&x.stato!=='CHIUSO').length}</b></button>
      <button class="queue-card" data-filter="MINE"><span>I miei</span><b>${d.filter(x=>x.assigned_to===user.id&&x.stato!=='CHIUSO').length}</b></button>
      <button class="queue-card" data-filter="URGENT"><span>Urgenti</span><b>${d.filter(x=>x.priorita==='URGENTE'&&x.stato!=='CHIUSO').length}</b></button>
      <button class="queue-card" data-filter="STALE"><span>Fermi &gt;48h</span><b>${d.filter(x=>x.stato!=='CHIUSO'&&((Date.now()-new Date(x.updated_at||x.created_at))/3600000)>48).length}</b></button>
    </div>

    <div class="panel">
      <div class="queue-toolbar advanced">
        <input id="queueSearch" placeholder="Cerca ticket, nome, email, oggetto...">
        <select id="queueCategory"><option value="">Tutte le categorie</option>${categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select>
        ${isSuperIT()?`<select id="queueAssignee"><option value="">Tutti gli IT</option><option value="UNASSIGNED">Non assegnati</option>${its.map(i=>`<option value="${i.id}">${esc(i.nome||i.email)}</option>`).join('')}</select>`:''}
        <select id="queueOrder">
          <option value="old">Più vecchi prima</option>
          <option value="new">Più recenti prima</option>
          <option value="priority">Priorità</option>
          <option value="activity">Ultima attività</option>
        </select>
      </div>
      <div id="queueTable"></div>
    </div>`;

  const rank={URGENTE:4,ALTA:3,NORMALE:2,BASSA:1};

  const render=()=>{
    let rows=d.filter(x=>{
      if(filter==='OPEN'&&x.stato==='CHIUSO')return false;
      if(filter==='UNASSIGNED'&&(x.assigned_to||x.stato==='CHIUSO'))return false;
      if(filter==='MINE'&&(x.assigned_to!==user.id||x.stato==='CHIUSO'))return false;
      if(filter==='URGENT'&&(x.priorita!=='URGENTE'||x.stato==='CHIUSO'))return false;
      if(filter==='STALE'&&(x.stato==='CHIUSO'||((Date.now()-new Date(x.updated_at||x.created_at))/3600000)<=48))return false;
      if(category&&x.categoria!==category)return false;
      if(assignee==='UNASSIGNED'&&x.assigned_to)return false;
      if(assignee&&assignee!=='UNASSIGNED'&&x.assigned_to!==assignee)return false;
      if(search){
        const h=`${x.numero_ticket||''} ${x.richiedente_nome||''} ${x.richiedente_email||''} ${x.oggetto||''} ${x.categoria||''} ${x.sede||''}`.toLowerCase();
        if(!h.includes(search.toLowerCase()))return false;
      }
      return true;
    });

    rows=[...rows].sort((a,b)=>{
      if(order==='priority')return (rank[b.priorita||'NORMALE']-rank[a.priorita||'NORMALE'])||new Date(a.created_at)-new Date(b.created_at);
      if(order==='new')return new Date(b.created_at)-new Date(a.created_at);
      if(order==='activity')return new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at);
      return new Date(a.created_at)-new Date(b.created_at);
    });

    $('queueTable').innerHTML=`
      <div class="tablewrap"><table>
        <thead><tr><th>Ticket</th><th>Assegnato</th><th>Priorità</th><th>Richiedente</th><th>Categoria</th><th>Stato</th><th>Ultima attività</th><th></th></tr></thead>
        <tbody>${rows.map(x=>`<tr class="${ageClass(x.updated_at||x.created_at)}">
          <td><b class="ticket-link" data-open="${x.id}">${x.numero_ticket||num(x.id)}</b><small class="subline">${esc(x.sede||'')}</small></td>
          <td>${x.assegnato_a?esc(x.assegnato_a):'<span class="unassigned">NON ASSEGNATO</span>'}</td>
          <td>${priorityBadge(x.priorita)}</td>
          <td>${esc(x.richiedente_nome||x.richiedente_email)}</td>
          <td>${esc(x.categoria)}</td>
          <td>${badge(x.stato)}</td>
          <td>${relTime(x.updated_at||x.created_at)}</td>
          <td>${!x.assigned_to&&x.stato!=='CHIUSO'?`<button class="secondary compact take-row" data-take="${x.id}">Prendi</button>`:''}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;

    document.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>detail(+x.dataset.open));
    document.querySelectorAll('[data-take]').forEach(btn=>btn.onclick=async()=>{
      const id=+btn.dataset.take;
      await update('tickets',`id=eq.${id}`,{
        assigned_to:user.id,
        assegnato_a:currentITName(),
        stato:'IN LAVORAZIONE'
      });
      await insert('ticket_history',{ticket_id:id,evento:`Preso in carico da ${currentITName()}`,autore:currentITName()},false);
      toast('Ticket preso in carico');
      it();
    });
  };

  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{
    filter=b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');render();
  });
  $('queueSearch').oninput=e=>{search=e.target.value;render()};
  $('queueCategory').onchange=e=>{category=e.target.value;render()};
  if($('queueAssignee'))$('queueAssignee').onchange=e=>{assignee=e.target.value;render()};
  $('queueOrder').onchange=e=>{order=e.target.value;render()};
  render();
}
async function calendar(){if(!isITRole())return userHome();page('Calendario','Appuntamenti collegati ai ticket');const d=await select('appointments','select=*,tickets(numero_ticket,oggetto,richiedente_nome)&order=start_at.asc');$('content').innerHTML=`<div class="panel"><h3>Appuntamenti</h3>${d.length?d.map(a=>`<div class="appointment"><b>${fmt(a.start_at)} • ${esc(a.modalita)}</b><div>${esc(a.tickets?.numero_ticket||'')} — ${esc(a.tickets?.oggetto||'')}</div><small>${esc(a.tickets?.richiedente_nome||'')} • ${a.durata_minuti} min</small></div>`).join(''):'<p>Nessun appuntamento.</p>'}</div>`}
async function bookings(){
  if(!isITRole())return userHome();
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
  if(!isITRole())return userHome();
  const rows=await select('material_bookings',`select=*,tickets(numero_ticket,oggetto,stato,priorita,richiedente_nome,richiedente_email)&id=eq.${id}`);
  if(!rows.length)return;
  const b=rows[0];

  const assets=await select('assets','select=id,asset_code,category,brand,model,serial_number,status,site,verification_status&status=in.(DISPONIBILE,PRENOTATO,IN PRESTITO,DA VERIFICARE)&order=asset_code.asc');
  const currentAsset=b.asset_id?assets.find(a=>a.id===b.asset_id):null;

  page('Prenotazione materiale',b.tickets?.numero_ticket||'');

  $('content').innerHTML=`
    <div class="panel booking-summary">
      <div class="it-management-head">
        <div><h3>${esc(b.material_type)} × ${b.quantity}</h3><p class="muted-line">${esc(b.requester_name||b.requester_email)} • ${esc(b.site)}</p></div>
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
          <option>RICHIESTA</option><option>DA VERIFICARE</option><option>CONFERMATA</option><option>PRONTA</option><option>CONSEGNATA</option><option>RESTITUITA</option>
        </select></label>

        <label>Asset dal censimento<select id="bookingAsset">
          <option value="">Seleziona asset...</option>
          ${assets.map(a=>`<option value="${a.id}">${esc(a.asset_code)} — ${esc([a.brand,a.model].filter(Boolean).join(' ')||a.category||'')} — ${esc(a.status)}</option>`).join('')}
        </select></label>

        <label>Codice asset<input id="assetCode" value="${esc(b.asset_code||'')}" readonly></label>
        <label>Descrizione / modello<input id="assetModel" value="${esc(b.asset_model||'')}" readonly></label>
        <label>Seriale<input id="assetSerial" value="${esc(b.asset_serial||'')}" readonly></label>
        <label class="full">Accessori consegnati<input id="deliveredAccessories" value="${esc(b.delivered_accessories||'')}"></label>
        <label>Data restituzione effettiva<input id="actualReturn" type="date" value="${b.actual_return_date||''}"></label>
        <label>Stato al rientro<select id="returnCondition">
          <option value="">—</option><option>OK</option><option>DA VERIFICARE</option><option>DANNEGGIATO</option><option>ACCESSORIO MANCANTE</option>
        </select></label>
        <label class="full">Note rientro<textarea id="returnNotes" rows="2">${esc(b.return_notes||'')}</textarea></label>
        <label class="full">Note IT <span class="optional">(facoltative)</span><textarea id="bookItNotes" rows="3">${esc(b.it_notes||'')}</textarea></label>
      </div>
      <div class="button-row">
        <button id="saveBooking" class="primary">Salva prenotazione</button>
        <button id="printDelivery" class="secondary">Genera verbale / PDF</button>
      </div>
      <p class="muted-line">L'asset viene scelto dal censimento e il suo stato viene aggiornato automaticamente in base alla prenotazione.</p>
    </div>`;

  $('bookStatus').value=b.status||'RICHIESTA';
  $('returnCondition').value=b.return_condition||'';
  $('bookingAsset').value=b.asset_id||'';
  $('openBookingTicket').onclick=()=>detail(b.ticket_id);

  $('bookingAsset').onchange=()=>{
    const a=assets.find(x=>String(x.id)===$('bookingAsset').value);
    $('assetCode').value=a?.asset_code||'';
    $('assetModel').value=[a?.brand,a?.model].filter(Boolean).join(' ')||a?.category||'';
    $('assetSerial').value=a?.serial_number||'';
  };

  const syncAssetStatus=async(oldAssetId,newAssetId,newBookingStatus,returnCondition)=>{
    // Libera il vecchio asset se viene cambiato.
    if(oldAssetId&&String(oldAssetId)!==String(newAssetId||'')){
      const oldRows=await select('assets',`select=*&id=eq.${oldAssetId}`);
      if(oldRows[0]){
        await update('assets',`id=eq.${oldAssetId}`,{
          status:'DISPONIBILE',
          assigned_user_name:null,
          assigned_user_email:null,
          updated_at:new Date().toISOString()
        });
        await insert('asset_history',{
          asset_id:oldAssetId,event_type:'PRENOTAZIONE',
          field_name:'status',old_value:oldRows[0].status,new_value:'DISPONIBILE',
          changed_by:currentITName(),changed_by_id:user.id
        },false);
      }
    }

    if(!newAssetId)return;
    const ar=await select('assets',`select=*&id=eq.${newAssetId}`);
    const a=ar[0];
    if(!a)return;

    let next=a.status;
    let assigneeName=a.assigned_user_name;
    let assigneeEmail=a.assigned_user_email;

    if(['CONFERMATA','PRONTA'].includes(newBookingStatus))next='PRENOTATO';
    else if(newBookingStatus==='CONSEGNATA'){
      next='IN PRESTITO';
      assigneeName=b.requester_name||b.requester_email;
      assigneeEmail=b.requester_email;
    }else if(newBookingStatus==='RESTITUITA'){
      next=returnCondition==='DANNEGGIATO'?'GUASTO':returnCondition==='OK'?'DISPONIBILE':'DA VERIFICARE';
      if(next==='DISPONIBILE'){
        assigneeName=null; assigneeEmail=null;
      }
    }

    if(next!==a.status || assigneeEmail!==a.assigned_user_email){
      await update('assets',`id=eq.${newAssetId}`,{
        status:next,
        assigned_user_name:assigneeName,
        assigned_user_email:assigneeEmail,
        verification_status:newBookingStatus==='RESTITUITA'&&returnCondition!=='OK'?'DA VERIFICARE':a.verification_status,
        updated_at:new Date().toISOString()
      });
      await insert('asset_history',{
        asset_id:newAssetId,event_type:'PRENOTAZIONE',
        field_name:'status',old_value:a.status,new_value:next,
        changed_by:currentITName(),changed_by_id:user.id
      },false);
    }
  };

  $('saveBooking').onclick=async()=>{
    const newAssetId=$('bookingAsset').value?+$('bookingAsset').value:null;
    const selected=assets.find(x=>x.id===newAssetId);
    const newStatus=$('bookStatus').value;
    const retCond=$('returnCondition').value||null;

    if(['CONFERMATA','PRONTA','CONSEGNATA'].includes(newStatus)&&!newAssetId){
      return toast('Seleziona prima un asset dal censimento');
    }

    await update('material_bookings',`id=eq.${id}`,{
      status:newStatus,
      asset_id:newAssetId,
      asset_code:selected?.asset_code||null,
      asset_model:selected?([selected.brand,selected.model].filter(Boolean).join(' ')||selected.category||null):null,
      asset_serial:selected?.serial_number||null,
      delivered_accessories:$('deliveredAccessories').value.trim()||null,
      actual_return_date:$('actualReturn').value||null,
      return_condition:retCond,
      return_notes:$('returnNotes').value.trim()||null,
      it_notes:$('bookItNotes').value.trim()||null,
      prepared_by:currentITName(),
      updated_at:new Date().toISOString()
    });

    await syncAssetStatus(b.asset_id,newAssetId,newStatus,retCond);
    toast('Prenotazione aggiornata');
    bookingDetail(id);
  };

  $('printDelivery').onclick=()=>{
    const selected=assets.find(x=>String(x.id)===$('bookingAsset').value);
    const live={...b,
      status:$('bookStatus').value,
      asset_id:selected?.id||null,
      asset_code:selected?.asset_code||$('assetCode').value.trim(),
      asset_model:selected?([selected.brand,selected.model].filter(Boolean).join(' ')||selected.category):$('assetModel').value.trim(),
      asset_serial:selected?.serial_number||$('assetSerial').value.trim(),
      delivered_accessories:$('deliveredAccessories').value.trim(),
      actual_return_date:$('actualReturn').value,
      return_condition:$('returnCondition').value,
      return_notes:$('returnNotes').value.trim(),
      it_notes:$('bookItNotes').value.trim(),
      prepared_by:currentITName()
    };
    if(!live.asset_code)return toast('Seleziona prima un asset');
    printDeliverySheet(live);
  };
}

function printDeliverySheet(b){
  const w=window.open('','_blank','width=900,height=1000');
  if(!w)return toast('Il browser ha bloccato la finestra di stampa');

  const ticket=b.tickets?.numero_ticket||'';
  const html=`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Verbale ${esc(ticket)}</title>
  <style>
    @page{size:A4;margin:16mm}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:11px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}
    .logo{width:180px}.title{text-align:right}.title h1{font-size:17px;margin:0 0 5px}
    .section{margin:16px 0}.section h2{font-size:12px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #bbb;padding-bottom:5px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}.field span{display:block;color:#666;font-size:9px;text-transform:uppercase;margin-bottom:3px}
    .box{border:1px solid #bbb;padding:9px;min-height:34px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:42px;margin-top:42px}
    .signature{border-top:1px solid #111;padding-top:6px;text-align:center}.return{margin-top:28px;border-top:2px solid #111;padding-top:14px}
    footer{position:fixed;bottom:0;left:0;right:0;font-size:8px;color:#777;text-align:center}.no-print{margin-bottom:12px;padding:8px;background:#f1f1f1;text-align:center}
    @media print{.no-print{display:none}}
  </style></head><body>
    <div class="no-print">Stampa il documento oppure scegli “Salva come PDF”. Il file non viene caricato nel Service Desk.</div>
    <div class="head"><img class="logo" src="${location.href.replace(/[^/]*$/,'')}logo_archea.png"><div class="title"><h1>VERBALE CONSEGNA / RESTITUZIONE</h1><div>${esc(ticket)}</div></div></div>

    <div class="section"><h2>Consegna</h2><div class="grid">
      <div class="field"><span>Assegnatario</span><b>${esc(b.requester_name||b.requester_email)}</b></div>
      <div class="field"><span>Sede</span><b>${esc(b.site)}</b></div>
      <div class="field"><span>Data consegna</span><b>${dateOnly(b.pickup_date)}</b></div>
      <div class="field"><span>Restituzione prevista</span><b>${dateOnly(b.planned_return_date)}</b></div>
      <div class="field"><span>Motivo / progetto</span><b>${esc(b.reason)}</b></div>
      <div class="field"><span>Preparato da IT</span><b>${esc(b.prepared_by||'')}</b></div>
    </div></div>

    <div class="section"><h2>Materiale</h2><div class="grid">
      <div class="field"><span>Tipologia</span><b>${esc(b.material_type)} × ${b.quantity}</b></div>
      <div class="field"><span>Codice asset</span><b>${esc(b.asset_code||'—')}</b></div>
      <div class="field"><span>Modello</span><b>${esc(b.asset_model||'—')}</b></div>
      <div class="field"><span>Seriale</span><b>${esc(b.asset_serial||'—')}</b></div>
    </div></div>

    <div class="section"><h2>Accessori</h2><div class="box">${esc(b.delivered_accessories||b.requested_accessories||'Nessun accessorio indicato')}</div></div>
    <div class="section"><h2>Note consegna</h2><div class="box">${esc(b.it_notes||b.requester_notes||'')}</div></div>

    <div class="signatures"><div class="signature">Firma assegnatario alla consegna</div><div class="signature">Firma IT alla consegna</div></div>

    <div class="return">
      <div class="section"><h2>Restituzione</h2><div class="grid">
        <div class="field"><span>Data restituzione effettiva</span><b>${b.actual_return_date?dateOnly(b.actual_return_date):'________________'}</b></div>
        <div class="field"><span>Stato materiale al rientro</span><b>${esc(b.return_condition||'________________')}</b></div>
      </div></div>
      <div class="section"><h2>Note rientro</h2><div class="box">${esc(b.return_notes||'')}</div></div>
      <div class="signatures"><div class="signature">Firma assegnatario alla restituzione</div><div class="signature">Firma IT al ritiro</div></div>
    </div>

    <footer>Archea Associati — Archea Service Desk — Dipartimento IT</footer>
    <script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script>
  </body></html>`;
  w.document.open();w.document.write(html);w.document.close();
}


async function hrNewMovement(){
  if(!isHR()&&!isITRole())return userHome();
  page('Nuovo movimento','Registra un movimento con impatto sul reparto IT');

  $('content').innerHTML=`
    <div class="panel">
      <form id="hrMoveForm" class="formgrid">
        <label>Tipo movimento
          <select id="moveType" required>
            <option value="">Seleziona...</option>
            <option>NUOVO INGRESSO</option>
            <option>USCITA</option>
            <option>CAMBIO POSTAZIONE</option>
            <option>CAMBIO SEDE</option>
          </select>
        </label>
        <label>Data movimento<input id="moveDate" type="date" required></label>

        <label>Nome<input id="personName" required></label>
        <label>Cognome<input id="personSurname" required></label>
        <label>Email aziendale<input id="personEmail" type="email" placeholder="nome.cognome@archea.it"></label>
        <label>Sede attuale<input id="currentSite"></label>
        <label>Nuova sede<input id="newSite"></label>
        <label>Postazione attuale<input id="currentDesk"></label>
        <label>Nuova postazione<input id="newDesk"></label>
        <label class="full">Note <span class="optional">(facoltative)</span>
          <textarea id="moveNotes" rows="4"></textarea>
        </label>

        <div class="full info-box">
          Il movimento crea automaticamente un ticket IT e viene salvato nello storico HR.
          Per ora non viene ancora scritto direttamente nel file Excel HR.
        </div>

        <div class="full">
          <button class="primary">Registra movimento</button>
        </div>
      </form>
      <p id="hrMoveResult"></p>
    </div>`;

  $('moveDate').value=new Date().toISOString().slice(0,10);

  $('hrMoveForm').onsubmit=async e=>{
    e.preventDefault();
    $('hrMoveResult').textContent='';

    try{
      const type=$('moveType').value;
      const email=$('personEmail').value.trim().toLowerCase();
      const name=$('personName').value.trim();
      const surname=$('personSurname').value.trim();

      if(email && !email.endsWith('@archea.it')){
        throw new Error('Se inserita, la mail deve essere aziendale @archea.it.');
      }

      const payload={
        movement_type:type,
        movement_date:$('moveDate').value,
        person_name:name,
        person_surname:surname,
        person_email:email||null,
        current_site:$('currentSite').value.trim()||null,
        new_site:$('newSite').value.trim()||null,
        current_desk:$('currentDesk').value.trim()||null,
        new_desk:$('newDesk').value.trim()||null,
        notes:$('moveNotes').value.trim()||null,
        created_by:user.id,
        created_by_email:user.email,
        created_by_name:profile.nome,
        status:'DA VERIFICARE'
      };

      const checkParams = new URLSearchParams();
      checkParams.set('select','id,movement_type,movement_date,person_email,person_name,person_surname,status');
      if(email) checkParams.set('person_email','eq.'+email);

      let possible=[];
      if(email){
        possible=await select('hr_movements',checkParams.toString());
      }else{
        possible=await select('hr_movements',
          `select=id,movement_type,movement_date,person_email,person_name,person_surname,status&person_name=ilike.${encodeURIComponent(name)}&person_surname=ilike.${encodeURIComponent(surname)}`
        );
      }

      let duplicate=false;
      if(type==='NUOVO INGRESSO'){
        duplicate=possible.some(x=>x.movement_type==='NUOVO INGRESSO'&&x.status!=='ANNULLATO');
      }else if(type==='USCITA'){
        duplicate=possible.some(x=>x.movement_type==='USCITA'&&x.status!=='ANNULLATO');
      }else{
        duplicate=possible.some(x=>x.movement_type===type&&x.movement_date===$('moveDate').value&&x.status!=='ANNULLATO');
      }

      if(duplicate){
        throw new Error('Possibile duplicato rilevato. Il movimento non è stato creato: verifica prima lo storico.');
      }

      const ticketDesc = [
        `Movimento: ${type}`,
        `Persona: ${name} ${surname}`,
        email?`Email: ${email}`:'',
        $('currentSite').value?`Sede attuale: ${$('currentSite').value.trim()}`:'',
        $('newSite').value?`Nuova sede: ${$('newSite').value.trim()}`:'',
        $('currentDesk').value?`Postazione attuale: ${$('currentDesk').value.trim()}`:'',
        $('newDesk').value?`Nuova postazione: ${$('newDesk').value.trim()}`:'',
        $('moveNotes').value?`Note: ${$('moveNotes').value.trim()}`:''
      ].filter(Boolean).join('\n');

      const trows=await insert('tickets',{
        categoria:'Movimento persona',
        oggetto:`${type} - ${name} ${surname}`,
        descrizione:ticketDesc,
        stato:'APERTO',
        priorita:'NORMALE',
        richiedente_nome:profile.nome,
        richiedente_email:user.email,
        created_by:user.id,
        created_by_name:profile.nome,
        origine:'HR',
        sede:$('newSite').value.trim()||$('currentSite').value.trim()||null
      });

      const ticket=trows[0];
      const ticketNo=`MOV-${new Date().getFullYear()}-${String(ticket.id).padStart(5,'0')}`;
      await update('tickets',`id=eq.${ticket.id}`,{numero_ticket:ticketNo});

      const mrows=await insert('hr_movements',{...payload,ticket_id:ticket.id},true);
      const movement=mrows[0];

      await insert('ticket_history',{
        ticket_id:ticket.id,
        evento:`Movimento HR creato: ${type}`,
        autore:profile.nome
      },false);

      try{
        await api('/functions/v1/telegram-new-ticket',{method:'POST',body:{ticket_id:ticket.id}});
      }catch(e){console.warn('Telegram non inviato:',e.message)}

      $('hrMoveForm').reset();
      $('moveDate').value=new Date().toISOString().slice(0,10);
      $('hrMoveResult').innerHTML=`Movimento registrato. Ticket <b>${ticketNo}</b>. Stato HR: <b>DA VERIFICARE</b>.`;
      toast('Movimento HR creato');
    }catch(err){
      $('hrMoveResult').textContent=err.message;
    }
  };
}

async function hrHistory(){
  if(!isHR()&&!isITRole())return userHome();
  page('Storico movimenti','Ingressi, uscite e spostamenti registrati');

  const rows=await select('hr_movements','select=*,tickets(numero_ticket,stato)&order=movement_date.desc,created_at.desc');
  let q='',type='',site='',status='';

  const sites=[...new Set(rows.flatMap(x=>[x.current_site,x.new_site]).filter(Boolean))].sort();

  $('content').innerHTML=`
    <div class="panel">
      <div class="queue-toolbar advanced">
        <input id="hrSearch" placeholder="Cerca persona, email, ticket...">
        <select id="hrType"><option value="">Tutti i movimenti</option>
          <option>NUOVO INGRESSO</option><option>USCITA</option><option>CAMBIO POSTAZIONE</option><option>CAMBIO SEDE</option>
        </select>
        <select id="hrSite"><option value="">Tutte le sedi</option>${sites.map(s=>`<option>${esc(s)}</option>`).join('')}</select>
        <select id="hrStatus"><option value="">Tutti gli stati</option>
          <option>DA VERIFICARE</option><option>VERIFICATO</option><option>ANNULLATO</option>
        </select>
      </div>
      <div id="hrHistoryTable"></div>
    </div>`;

  const render=()=>{
    const filtered=rows.filter(x=>{
      if(type&&x.movement_type!==type)return false;
      if(site&&x.current_site!==site&&x.new_site!==site)return false;
      if(status&&x.status!==status)return false;
      if(q){
        const h=`${x.person_name||''} ${x.person_surname||''} ${x.person_email||''} ${x.tickets?.numero_ticket||''} ${x.current_site||''} ${x.new_site||''}`.toLowerCase();
        if(!h.includes(q.toLowerCase()))return false;
      }
      return true;
    });

    $('hrHistoryTable').innerHTML=filtered.length?`
      <div class="tablewrap"><table>
        <thead><tr><th>Data</th><th>Tipo</th><th>Persona</th><th>Sede</th><th>Postazione</th><th>Ticket</th><th>Stato HR</th></tr></thead>
        <tbody>${filtered.map(x=>`<tr>
          <td>${dateOnly(x.movement_date)}</td>
          <td><b>${esc(x.movement_type)}</b></td>
          <td>${esc(`${x.person_name} ${x.person_surname}`)}<small class="subline">${esc(x.person_email||'')}</small></td>
          <td>${esc(x.current_site||'—')} ${x.new_site?`→ ${esc(x.new_site)}`:''}</td>
          <td>${esc(x.current_desk||'—')} ${x.new_desk?`→ ${esc(x.new_desk)}`:''}</td>
          <td>${x.ticket_id?`<b class="ticket-link" data-open="${x.ticket_id}">${esc(x.tickets?.numero_ticket||'')}</b>`:'—'}</td>
          <td>${isITRole()?`<select data-hr-status="${x.id}">
            <option ${x.status==='DA VERIFICARE'?'selected':''}>DA VERIFICARE</option>
            <option ${x.status==='VERIFICATO'?'selected':''}>VERIFICATO</option>
            <option ${x.status==='ANNULLATO'?'selected':''}>ANNULLATO</option>
          </select>`:`<span class="badge">${esc(x.status)}</span>`}</td>
        </tr>`).join('')}</tbody>
      </table></div>`:'<div class="empty">Nessun movimento.</div>';

    document.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>detail(+x.dataset.open));
    if(isITRole()){
      document.querySelectorAll('[data-hr-status]').forEach(s=>s.onchange=async()=>{
        await update('hr_movements',`id=eq.${s.dataset.hrStatus}`,{
          status:s.value,
          verified_by:s.value==='VERIFICATO'?currentITName():null,
          verified_at:s.value==='VERIFICATO'?new Date().toISOString():null
        });
        toast('Stato HR aggiornato');
      });
    }
  };

  $('hrSearch').oninput=e=>{q=e.target.value;render()};
  $('hrType').onchange=e=>{type=e.target.value;render()};
  $('hrSite').onchange=e=>{site=e.target.value;render()};
  $('hrStatus').onchange=e=>{status=e.target.value;render()};
  render();
}

async function hrStats(){
  if(!isHR()&&!isITRole())return userHome();
  page('Statistiche HR','Movimenti registrati nel Service Desk');

  const rows=await select('hr_movements','select=*&status=neq.ANNULLATO&order=movement_date.asc');

  const totalIn=rows.filter(x=>x.movement_type==='NUOVO INGRESSO').length;
  const totalOut=rows.filter(x=>x.movement_type==='USCITA').length;
  const moves=rows.filter(x=>x.movement_type==='CAMBIO SEDE'||x.movement_type==='CAMBIO POSTAZIONE').length;
  const pending=rows.filter(x=>x.status==='DA VERIFICARE').length;

  const monthMap={};
  rows.forEach(x=>{
    const key=(x.movement_date||'').slice(0,7);
    if(!key)return;
    monthMap[key]??={in:0,out:0,move:0};
    if(x.movement_type==='NUOVO INGRESSO')monthMap[key].in++;
    else if(x.movement_type==='USCITA')monthMap[key].out++;
    else monthMap[key].move++;
  });

  const siteMap={};
  rows.forEach(x=>{
    const s=x.new_site||x.current_site||'Non specificata';
    siteMap[s]??={in:0,out:0,move:0};
    if(x.movement_type==='NUOVO INGRESSO')siteMap[s].in++;
    else if(x.movement_type==='USCITA')siteMap[s].out++;
    else siteMap[s].move++;
  });

  $('content').innerHTML=`
    <div class="metrics">
      <div class="metric"><span>Ingressi</span><b>${totalIn}</b></div>
      <div class="metric"><span>Uscite</span><b>${totalOut}</b></div>
      <div class="metric"><span>Spostamenti</span><b>${moves}</b></div>
      <div class="metric"><span>Da verificare</span><b>${pending}</b></div>
    </div>

    <div class="dashboard-grid">
      <div class="panel">
        <h3>Per mese</h3>
        <div class="tablewrap"><table>
          <thead><tr><th>Mese</th><th>Ingressi</th><th>Uscite</th><th>Spostamenti</th></tr></thead>
          <tbody>${Object.entries(monthMap).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,v])=>`<tr><td>${esc(m)}</td><td>${v.in}</td><td>${v.out}</td><td>${v.move}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
      <div class="panel">
        <h3>Per sede</h3>
        <div class="tablewrap"><table>
          <thead><tr><th>Sede</th><th>Ingressi</th><th>Uscite</th><th>Spostamenti</th></tr></thead>
          <tbody>${Object.entries(siteMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([s,v])=>`<tr><td>${esc(s)}</td><td>${v.in}</td><td>${v.out}</td><td>${v.move}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>

    <div class="panel">
      <div class="info-box">
        Lo storico HR del portale parte dai movimenti registrati qui. Il collegamento diretto al file HR aziendale verrà aggiunto in uno step successivo con controlli anti-duplicazione.
      </div>
    </div>`;
}


async function census(){
  if(!isITRole())return userHome();
  page('Censimento','Inventario IT, verifica asset e storico');

  const rows=await select('assets','select=*&order=asset_code.asc');
  let q='',site='',status='',verification='';

  const sites=[...new Set(rows.map(x=>x.site).filter(Boolean))].sort();

  $('content').innerHTML=`
    <div class="metrics">
      <div class="metric"><span>Asset totali</span><b>${rows.length}</b></div>
      <div class="metric"><span>Verificati</span><b>${rows.filter(x=>x.verification_status==='VERIFICATO').length}</b></div>
      <div class="metric"><span>Da verificare</span><b>${rows.filter(x=>x.verification_status!=='VERIFICATO').length}</b></div>
      <div class="metric"><span>Disponibili</span><b>${rows.filter(x=>x.status==='DISPONIBILE').length}</b></div>
    </div>

    <div class="panel">
      <div class="asset-toolbar">
        <input id="assetSearch" placeholder="Cerca codice, seriale, modello, utente...">
        <select id="assetSite"><option value="">Tutte le sedi</option>${sites.map(s=>`<option>${esc(s)}</option>`).join('')}</select>
        <select id="assetStatus">
          <option value="">Tutti gli stati</option>
          <option>DISPONIBILE</option><option>ASSEGNATO</option><option>PRENOTATO</option><option>IN PRESTITO</option>
          <option>IN MANUTENZIONE</option><option>GUASTO</option><option>DISMESSO</option><option>VENDUTO</option><option>DA VERIFICARE</option>
        </select>
        <select id="assetVerification">
          <option value="">Tutte le verifiche</option>
          <option>VERIFICATO</option><option>DA VERIFICARE</option><option>DUBBIO</option><option>NON TROVATO</option><option>ASSEGNAZIONE DA CONFERMARE</option>
        </select>
      </div>

      <div class="button-row asset-actions">
        <button id="newAsset" class="primary">+ Nuovo asset</button>
        ${isSuperIT()?'<button id="importAssets" class="secondary">Importa censimento Excel</button>':''}
      </div>

      <div id="assetTable"></div>
    </div>

    ${isSuperIT()?`<div id="importPanel" class="panel hidden">
      <h3>Importazione censimento Excel</h3>
      <p class="muted-line">Il file viene letto dalla Edge Function e non viene archiviato. Le password, PIN e PUK presenti nel foglio non vengono importati.</p>
      <label>File .xlsx<input id="assetFile" type="file" accept=".xlsx,.xls"></label>
      <div class="info-box">
        Tutti i dati importati partono come <b>DA VERIFICARE</b>. Un asset già verificato nel portale non viene sovrascritto da una nuova importazione legacy.
      </div>
      <button id="runAssetImport" class="primary">Avvia importazione</button>
      <p id="assetImportResult"></p>
    </div>`:''}`;

  const render=()=>{
    const filtered=rows.filter(x=>{
      if(site&&x.site!==site)return false;
      if(status&&x.status!==status)return false;
      if(verification&&x.verification_status!==verification)return false;
      if(q){
        const h=`${x.asset_code||''} ${x.category||''} ${x.brand||''} ${x.model||''} ${x.serial_number||''} ${x.site||''} ${x.position||''} ${x.assigned_user_name||''} ${x.assigned_user_email||''}`.toLowerCase();
        if(!h.includes(q.toLowerCase()))return false;
      }
      return true;
    });

    $('assetTable').innerHTML=filtered.length?`
      <div class="tablewrap"><table>
        <thead><tr><th>Codice</th><th>Categoria / Modello</th><th>Sede / Posizione</th><th>Assegnato a</th><th>Stato</th><th>Verifica</th><th>Ultima verifica</th></tr></thead>
        <tbody>${filtered.map(a=>`<tr class="click" data-asset="${a.id}">
          <td><b>${esc(a.asset_code)}</b><small class="subline">${esc(a.serial_number||'')}</small></td>
          <td><b>${esc(a.category||'—')}</b><small class="subline">${esc([a.brand,a.model].filter(Boolean).join(' ')||'')}</small></td>
          <td>${esc(a.site||'—')}<small class="subline">${esc(a.position||'')}</small></td>
          <td>${esc(a.assigned_user_name||a.assigned_user_email||'—')}</td>
          <td>${assetStatusBadge(a.status)}</td>
          <td>${verifyBadge(a.verification_status)}</td>
          <td>${a.verified_at?`${fmt(a.verified_at)}<small class="subline">${esc(a.verified_by||'')}</small>`:'—'}</td>
        </tr>`).join('')}</tbody>
      </table></div>`:'<div class="empty">Nessun asset trovato.</div>';

    document.querySelectorAll('[data-asset]').forEach(x=>x.onclick=()=>assetDetail(+x.dataset.asset));
  };

  $('assetSearch').oninput=e=>{q=e.target.value;render()};
  $('assetSite').onchange=e=>{site=e.target.value;render()};
  $('assetStatus').onchange=e=>{status=e.target.value;render()};
  $('assetVerification').onchange=e=>{verification=e.target.value;render()};
  $('newAsset').onclick=()=>assetEdit(null);

  if($('importAssets'))$('importAssets').onclick=()=>$('importPanel').classList.toggle('hidden');

  if($('runAssetImport'))$('runAssetImport').onclick=async()=>{
    const file=$('assetFile').files?.[0];
    if(!file)return toast('Seleziona un file Excel');
    $('assetImportResult').textContent='Importazione in corso...';

    try{
      const b64=await new Promise((resolve,reject)=>{
        const r=new FileReader();
        r.onload=()=>resolve(String(r.result).split(',')[1]);
        r.onerror=()=>reject(r.error);
        r.readAsDataURL(file);
      });

      const res=await api('/functions/v1/import-censimento',{
        method:'POST',
        body:{file_name:file.name,file_base64:b64}
      });

      $('assetImportResult').innerHTML=`Importazione completata: <b>${res.inserted||0}</b> nuovi, <b>${res.updated||0}</b> aggiornati, <b>${res.skipped_verified||0}</b> già verificati non modificati, <b>${res.skipped_invalid||0}</b> righe ignorate.`;
      toast('Censimento importato');
      setTimeout(()=>census(),1200);
    }catch(err){
      $('assetImportResult').textContent=err.message;
    }
  };

  render();
}

async function assetEdit(id){
  if(!isITRole())return userHome();

  let a={
    asset_code:'',category:'',brand:'',model:'',serial_number:'',site:'',position:'',
    assigned_user_name:'',assigned_user_email:'',storage:'',gpu:'',ram:'',cpu:'',
    notes:'',status:'DA VERIFICARE',verification_status:'DA VERIFICARE',account_identifier:''
  };

  if(id){
    const rows=await select('assets',`select=*&id=eq.${id}`);
    if(!rows.length)return;
    a=rows[0];
  }

  page(id?'Modifica asset':'Nuovo asset',id?a.asset_code:'Inserimento manuale');

  $('content').innerHTML=`
    <div class="panel">
      <form id="assetForm" class="formgrid">
        <label>Codice asset<input id="aCode" value="${esc(a.asset_code||'')}" required placeholder="A0345"></label>
        <label>Categoria<input id="aCategory" value="${esc(a.category||'')}"></label>
        <label>Marca<input id="aBrand" value="${esc(a.brand||'')}"></label>
        <label>Modello<input id="aModel" value="${esc(a.model||'')}"></label>
        <label>Seriale<input id="aSerial" value="${esc(a.serial_number||'')}"></label>
        <label>Sede<input id="aSite" value="${esc(a.site||'')}"></label>
        <label>Posizione<input id="aPosition" value="${esc(a.position||'')}"></label>
        <label>Utente assegnato<input id="aUserName" value="${esc(a.assigned_user_name||'')}"></label>
        <label>Email utente<input id="aUserEmail" type="email" value="${esc(a.assigned_user_email||'')}"></label>
        <label>Account associato <span class="optional">(solo identificativo)</span><input id="aAccount" value="${esc(a.account_identifier||'')}"></label>
        <label>SSD / HDD<input id="aStorage" value="${esc(a.storage||'')}"></label>
        <label>Scheda video<input id="aGpu" value="${esc(a.gpu||'')}"></label>
        <label>RAM<input id="aRam" value="${esc(a.ram||'')}"></label>
        <label>CPU<input id="aCpu" value="${esc(a.cpu||'')}"></label>
        <label>Stato<select id="aStatus">
          <option>DISPONIBILE</option><option>ASSEGNATO</option><option>PRENOTATO</option><option>IN PRESTITO</option>
          <option>IN MANUTENZIONE</option><option>GUASTO</option><option>DISMESSO</option><option>VENDUTO</option><option>DA VERIFICARE</option>
        </select></label>
        <label>Stato verifica<select id="aVerify">
          <option>VERIFICATO</option><option>DA VERIFICARE</option><option>DUBBIO</option><option>NON TROVATO</option><option>ASSEGNAZIONE DA CONFERMARE</option>
        </select></label>
        <label class="full">Note <span class="optional">(facoltative)</span><textarea id="aNotes" rows="4">${esc(a.notes||'')}</textarea></label>
        <div class="full info-box">
          Le password non devono essere inserite nel censimento. Il campo “Account associato” serve solo per indicare quale Apple ID / account Google è collegato al dispositivo.
        </div>
        <div class="full button-row">
          <button class="primary">Salva asset</button>
          ${id?'<button id="verifyAssetNow" type="button" class="secondary">Segna verificato ora</button>':''}
          <button id="backToCensus" type="button" class="ghost">Annulla</button>
        </div>
      </form>
    </div>`;

  $('aStatus').value=a.status||'DA VERIFICARE';
  $('aVerify').value=a.verification_status||'DA VERIFICARE';
  $('backToCensus').onclick=()=>census();

  if($('verifyAssetNow'))$('verifyAssetNow').onclick=async()=>{
    const before=a.verification_status;
    await update('assets',`id=eq.${id}`,{
      verification_status:'VERIFICATO',
      verified_by:currentITName(),
      verified_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    });
    await insert('asset_history',{
      asset_id:id,
      event_type:'VERIFICA',
      field_name:'verification_status',
      old_value:before||null,
      new_value:'VERIFICATO',
      changed_by:currentITName(),
      changed_by_id:user.id
    },false);
    toast('Asset verificato');
    assetDetail(id);
  };

  $('assetForm').onsubmit=async e=>{
    e.preventDefault();

    const data={
      asset_code:$('aCode').value.trim().toUpperCase(),
      category:$('aCategory').value.trim()||null,
      brand:$('aBrand').value.trim()||null,
      model:$('aModel').value.trim()||null,
      serial_number:$('aSerial').value.trim()||null,
      site:$('aSite').value.trim()||null,
      position:$('aPosition').value.trim()||null,
      assigned_user_name:$('aUserName').value.trim()||null,
      assigned_user_email:$('aUserEmail').value.trim().toLowerCase()||null,
      account_identifier:$('aAccount').value.trim()||null,
      storage:$('aStorage').value.trim()||null,
      gpu:$('aGpu').value.trim()||null,
      ram:$('aRam').value.trim()||null,
      cpu:$('aCpu').value.trim()||null,
      status:$('aStatus').value,
      verification_status:$('aVerify').value,
      notes:$('aNotes').value.trim()||null,
      updated_at:new Date().toISOString()
    };

    if(data.assigned_user_email&&!data.assigned_user_email.endsWith('@archea.it')){
      throw new Error('La mail assegnatario deve essere @archea.it.');
    }

    try{
      if(id){
        const tracked=[
          ['status',a.status,data.status],
          ['verification_status',a.verification_status,data.verification_status],
          ['site',a.site,data.site],
          ['position',a.position,data.position],
          ['assigned_user_name',a.assigned_user_name,data.assigned_user_name],
          ['assigned_user_email',a.assigned_user_email,data.assigned_user_email]
        ];

        await update('assets',`id=eq.${id}`,data);

        for(const [field,oldv,newv] of tracked){
          if((oldv||'')!==(newv||'')){
            await insert('asset_history',{
              asset_id:id,event_type:'MODIFICA',field_name:field,
              old_value:oldv==null?null:String(oldv),
              new_value:newv==null?null:String(newv),
              changed_by:currentITName(),changed_by_id:user.id
            },false);
          }
        }

        if(data.verification_status==='VERIFICATO'&&a.verification_status!=='VERIFICATO'){
          await update('assets',`id=eq.${id}`,{verified_by:currentITName(),verified_at:new Date().toISOString()});
        }

        toast('Asset aggiornato');
        assetDetail(id);
      }else{
        const rows=await insert('assets',{
          ...data,
          created_by:user.id,
          created_by_name:currentITName()
        },true);
        const created=rows[0];
        await insert('asset_history',{
          asset_id:created.id,event_type:'CREAZIONE',
          new_value:'Asset creato manualmente',
          changed_by:currentITName(),changed_by_id:user.id
        },false);
        toast('Asset creato');
        assetDetail(created.id);
      }
    }catch(err){
      toast(err.message);
    }
  };
}

async function assetDetail(id){
  if(!isITRole())return userHome();

  const rows=await select('assets',`select=*&id=eq.${id}`);
  if(!rows.length)return;
  const a=rows[0];
  const history=await select('asset_history',`select=*&asset_id=eq.${id}&order=created_at.desc&limit=100`);

  page('Dettaglio asset',a.asset_code);

  $('content').innerHTML=`
    <div class="panel">
      <div class="asset-detail-head">
        <div>
          <span class="asset-code-big">${esc(a.asset_code)}</span>
          <h3>${esc([a.brand,a.model].filter(Boolean).join(' ')||a.category||'Asset')}</h3>
          <p class="muted-line">${esc(a.category||'')} ${a.serial_number?`• S/N ${esc(a.serial_number)}`:''}</p>
        </div>
        <div class="asset-badges">${assetStatusBadge(a.status)} ${verifyBadge(a.verification_status)}</div>
      </div>

      <div class="asset-info-grid">
        <div><span>Sede</span><b>${esc(a.site||'—')}</b></div>
        <div><span>Posizione</span><b>${esc(a.position||'—')}</b></div>
        <div><span>Assegnato a</span><b>${esc(a.assigned_user_name||a.assigned_user_email||'—')}</b></div>
        <div><span>Account associato</span><b>${esc(a.account_identifier||'—')}</b></div>
        <div><span>SSD / HDD</span><b>${esc(a.storage||'—')}</b></div>
        <div><span>GPU</span><b>${esc(a.gpu||'—')}</b></div>
        <div><span>RAM</span><b>${esc(a.ram||'—')}</b></div>
        <div><span>CPU</span><b>${esc(a.cpu||'—')}</b></div>
      </div>

      ${a.notes?`<div class="info-box"><b>Note:</b> ${esc(a.notes)}</div>`:''}
      ${a.source_sheet?`<p class="muted-line">Origine legacy: ${esc(a.source_sheet)}${a.source_row?` • riga ${a.source_row}`:''}</p>`:''}
      ${a.verified_at?`<p class="verified-line">Verificato da <b>${esc(a.verified_by||'IT')}</b> il ${fmt(a.verified_at)}</p>`:''}

      <div class="button-row">
        <button id="editAsset" class="primary">Modifica asset</button>
        ${a.verification_status!=='VERIFICATO'?'<button id="quickVerify" class="secondary">Verifica ora</button>':''}
        <button id="backCensus" class="ghost">Torna al censimento</button>
      </div>
    </div>

    <div class="panel">
      <h3>Storico asset</h3>
      ${history.length?`<div class="history-list">${history.map(h=>`
        <div class="history-item">
          <div><b>${esc(h.event_type)}</b>${h.field_name?` • ${esc(h.field_name)}`:''}</div>
          <div>${h.old_value!=null?`<span class="history-old">${esc(h.old_value)}</span> → `:''}<span>${esc(h.new_value||'')}</span></div>
          <small>${fmt(h.created_at)} • ${esc(h.changed_by||'Sistema')}</small>
        </div>`).join('')}</div>`:'<div class="empty">Nessuno storico disponibile.</div>'}
    </div>`;

  $('editAsset').onclick=()=>assetEdit(id);
  $('backCensus').onclick=()=>census();

  if($('quickVerify'))$('quickVerify').onclick=async()=>{
    await update('assets',`id=eq.${id}`,{
      verification_status:'VERIFICATO',
      verified_by:currentITName(),
      verified_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    });
    await insert('asset_history',{
      asset_id:id,event_type:'VERIFICA',field_name:'verification_status',
      old_value:a.verification_status||null,new_value:'VERIFICATO',
      changed_by:currentITName(),changed_by_id:user.id
    },false);
    toast('Asset verificato');
    assetDetail(id);
  };
}

function placeholder(k){
  if(!isITRole())return userHome();
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

  if(!isITRole()&&t.richiedente_email!==user.email)return toast('Non autorizzato');

  let ap=[],materialBooking=null,collabs=[];
  try{ap=await select('appointments',`select=*&ticket_id=eq.${id}&order=start_at.desc`)}catch{}
  if(t.categoria==='Prenotazione materiale'){
    try{const mb=await select('material_bookings',`select=*&ticket_id=eq.${id}`);materialBooking=mb[0]||null}catch{}
  }
  if(isITRole()){
    try{collabs=await select('ticket_collaborators',`select=*,profiles(nome,email)&ticket_id=eq.${id}`)}catch{}
  }

  const its=isITRole()?await select('profiles','select=id,nome,email,ruolo&ruolo=in.(IT,SUPER_IT)&order=nome.asc'):[];
  const apHtml=ap.length?`<div class="appointment"><b>Appuntamento</b>${ap.map(a=>`<div class="appointment-row"><strong>${fmt(a.start_at)} • ${esc(a.modalita)} • ${a.durata_minuti} min</strong><span class="appointment-status ${(a.status||'PROPOSTO').toLowerCase()}">${a.status||'PROPOSTO'}</span></div>`).join('')}</div>`:'';

  $('content').innerHTML=`
    <div class="panel">
      <span class="badge">${t.numero_ticket||num(t.id)}</span>
      <h3>${esc(t.oggetto)}</h3>
      <p>${esc(t.categoria)} • ${esc(t.richiedente_nome||t.richiedente_email)} • ${fmt(t.created_at)}</p>
      <div class="ticket-meta-line">${badge(t.stato)} ${priorityBadge(t.priorita)} ${t.origine?`<span class="badge">${esc(t.origine)}</span>`:''}</div>
      <p>${esc(t.descrizione)}</p>
      ${t.created_by_name&&t.created_by_name!==t.richiedente_nome?`<div class="info-box">Creato da <b>${esc(t.created_by_name)}</b> per conto di <b>${esc(t.richiedente_email)}</b></div>`:''}
      ${apHtml}
      ${materialBooking?`<div class="appointment"><b>Richiesta materiale</b><div>${esc(materialBooking.material_type)} × ${materialBooking.quantity} • ${bookingStatusBadge(materialBooking.status)}</div>${isITRole()?`<button id="manageMaterial" class="secondary compact">Gestisci materiale</button>`:''}</div>`:''}
    </div>

    ${isITRole()?`<div class="panel">
      <div class="it-management-head"><div><h3>Gestione IT</h3><p class="muted-line">Responsabile, collaboratori, priorità e stato.</p></div>${!t.assigned_to?'<button id="takeTicket" class="primary">Prendi in carico</button>':''}</div>
      <div class="formgrid">
        <label>Stato<select id="st"><option>APERTO</option><option>IN LAVORAZIONE</option><option>IN ATTESA</option><option>CHIUSO</option></select></label>
        <label>Priorità<select id="priority"><option>BASSA</option><option>NORMALE</option><option>ALTA</option><option>URGENTE</option></select></label>
        <label>Responsabile<select id="assigneeSelect"><option value="">NON ASSEGNATO</option>${its.map(i=>`<option value="${i.id}">${esc(i.nome||i.email)}</option>`).join('')}</select></label>
        <label>Sede<input id="ticketSiteEdit" value="${esc(t.sede||'')}"></label>
        <label>Esito chiusura<select id="outcome"><option value="">—</option><option>RISOLTO</option><option>RISOLTO CON WORKAROUND</option><option>NON RIPRODUCIBILE</option><option>RICHIESTA ANNULLATA</option><option>ALTRO</option></select></label>
        <label class="full">Nota risoluzione <span class="optional">(facoltativa)</span><textarea id="resolutionNote" rows="2">${esc(t.resolution_note||'')}</textarea></label>
      </div>

      <div class="collaborators-box">
        <b>Collaboratori IT</b>
        <div id="collabList">${collabs.length?collabs.map(c=>`<span class="collab-chip">${esc(c.profiles?.nome||c.profiles?.email||'IT')} <button data-remove-collab="${c.user_id}">×</button></span>`).join(''):'<span class="muted-line">Nessuno</span>'}</div>
        <div class="inline-controls"><select id="collabSelect"><option value="">Aggiungi collaboratore...</option>${its.filter(i=>i.id!==t.assigned_to&&!collabs.some(c=>c.user_id===i.id)).map(i=>`<option value="${i.id}">${esc(i.nome||i.email)}</option>`).join('')}</select><button id="addCollab" class="secondary">Aggiungi</button></div>
      </div>

      <div class="button-row"><button id="saveTicket" class="primary">Salva gestione</button>${t.stato==='CHIUSO'?'<button id="reopenTicket" class="secondary">Riapri ticket</button>':''}</div>
    </div>

    <div class="panel"><h3>Fissa appuntamento</h3>
      <form id="apptForm" class="formgrid">
        <label>Data e ora<input id="apptStart" type="datetime-local" required></label>
        <label>Durata<select id="apptDur"><option>15</option><option selected>30</option><option>45</option><option>60</option></select></label>
        <label>Modalità<select id="apptMode"><option>Presso IT</option><option>Alla postazione utente</option><option>Remoto</option><option>Sala / sede</option></select></label>
        <label>Note<input id="apptNote"></label>
        <div class="full"><button class="primary">Invia proposta appuntamento</button></div>
      </form>
    </div>`:''}

    <div class="panel"><h3>Commenti</h3><div id="comments"></div>
      <form id="commentForm"><label>Commento<textarea id="ct" rows="3" required></textarea></label>${isITRole()?'<label><input id="internal" type="checkbox" style="width:auto"> Nota interna IT</label>':''}<button class="primary">Invia commento</button></form>
    </div>

    ${isITRole()?`<div class="panel"><h3>Checklist IT</h3><div id="checks"></div><form id="checkForm"><label>Nuova attività<input id="checkText"></label><button class="secondary">Aggiungi</button></form></div>`:''}`;

  if(isITRole()){
    $('st').value=t.stato;
    $('priority').value=t.priorita||'NORMALE';
    $('assigneeSelect').value=t.assigned_to||'';
    $('outcome').value=t.outcome||'';
    if($('manageMaterial')&&materialBooking)$('manageMaterial').onclick=()=>bookingDetail(materialBooking.id);

    if($('takeTicket'))$('takeTicket').onclick=async()=>{
      await update('tickets',`id=eq.${id}`,{assigned_to:user.id,assegnato_a:currentITName(),stato:'IN LAVORAZIONE'});
      await insert('ticket_history',{ticket_id:id,evento:`Preso in carico da ${currentITName()}`,autore:currentITName()},false);
      toast('Ticket preso in carico');detail(id);
    };

    $('saveTicket').onclick=async()=>{
      const newAssignee=$('assigneeSelect').value||null;
      const assigneeProfile=its.find(i=>i.id===newAssignee);
      const oldName=t.assegnato_a||'NON ASSEGNATO';
      const newName=assigneeProfile?.nome||assigneeProfile?.email||null;

      await update('tickets',`id=eq.${id}`,{
        stato:$('st').value,
        priorita:$('priority').value,
        assigned_to:newAssignee,
        assegnato_a:newName,
        sede:$('ticketSiteEdit').value.trim()||null,
        outcome:$('outcome').value||null,
        resolution_note:$('resolutionNote').value.trim()||null,
        closed_at:$('st').value==='CHIUSO'?new Date().toISOString():null
      });

      if(oldName!==(newName||'NON ASSEGNATO')){
        await insert('ticket_history',{ticket_id:id,evento:`Riassegnato: ${oldName} → ${newName||'NON ASSEGNATO'}`,autore:currentITName()},false);
      }
      toast('Ticket aggiornato');detail(id);refreshNotifications();
    };

    if($('reopenTicket'))$('reopenTicket').onclick=async()=>{
      await update('tickets',`id=eq.${id}`,{stato:'IN LAVORAZIONE',closed_at:null,outcome:null});
      await insert('ticket_history',{ticket_id:id,evento:'Ticket riaperto',autore:currentITName()},false);
      toast('Ticket riaperto');detail(id);
    };

    $('addCollab').onclick=async()=>{
      const uid=$('collabSelect').value;
      if(!uid)return;
      await insert('ticket_collaborators',{ticket_id:id,user_id:uid,added_by:user.id},false);
      await insert('ticket_history',{ticket_id:id,evento:'Collaboratore IT aggiunto',autore:currentITName()},false);
      detail(id);
    };
    document.querySelectorAll('[data-remove-collab]').forEach(b=>b.onclick=async()=>{
      await api(`/rest/v1/ticket_collaborators?ticket_id=eq.${id}&user_id=eq.${b.dataset.removeCollab}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
      detail(id);
    });

    $('apptForm').onsubmit=async e=>{
      e.preventDefault();
      await insert('appointments',{ticket_id:id,start_at:new Date($('apptStart').value).toISOString(),durata_minuti:+$('apptDur').value,modalita:$('apptMode').value,note:$('apptNote').value.trim()||null,created_by:user.id,status:'PROPOSTO'},false);
      await update('tickets',`id=eq.${id}`,{stato:'IN ATTESA'});
      toast('Proposta appuntamento inviata');detail(id);
    };
  }

  document.querySelectorAll('.ap-confirm').forEach(b=>b.onclick=async()=>{await update('appointments',`id=eq.${+b.dataset.apid}`,{status:'CONFERMATO',confirmed_at:new Date().toISOString(),confirmed_by:user.id});toast('Appuntamento confermato');detail(id)});
  document.querySelectorAll('.ap-decline').forEach(b=>b.onclick=async()=>{await update('appointments',`id=eq.${+b.dataset.apid}`,{status:'RIFIUTATO',confirmed_at:new Date().toISOString(),confirmed_by:user.id});toast('Appuntamento da riprogrammare');detail(id)});

  async function comments(){
    const d=await select('comments',`select=*&ticket_id=eq.${id}&order=created_at.asc`);
    const v=isITRole()?d:d.filter(x=>!x.nota_interna);
    $('comments').innerHTML=v.length?v.map(x=>`<div class="comment ${x.nota_interna?'internal':''}"><b>${esc(x.autore)}${x.nota_interna?' • Nota interna':''}</b><small style="float:right">${fmt(x.created_at)}</small><p>${esc(x.testo)}</p></div>`).join(''):'<p>Nessun commento.</p>';
  }
  $('commentForm').onsubmit=async e=>{
    e.preventDefault();
    await insert('comments',{ticket_id:id,autore:profile.nome,autore_email:user.email,testo:$('ct').value.trim(),nota_interna:isITRole()&&$('internal').checked},false);
    $('ct').value='';comments();refreshNotifications();
  };

  if(isITRole()){
    async function checks(){
      const d=await select('checklist_items',`select=*&ticket_id=eq.${id}&order=id.asc`);
      $('checks').innerHTML=d.length?d.map(x=>`<label class="check"><input type="checkbox" data-c="${x.id}" ${x.completato?'checked':''}><span>${esc(x.testo)}</span><small>${x.completato?`${esc(x.completed_by||'')} • ${fmt(x.completed_at)}`:''}</small></label>`).join(''):'<p>Nessuna attività.</p>';
      document.querySelectorAll('[data-c]').forEach(c=>c.onchange=()=>update('checklist_items',`id=eq.${+c.dataset.c}`,{completato:c.checked,completed_at:c.checked?new Date().toISOString():null,completed_by:c.checked?profile.nome:null}));
    }
    $('checkForm').onsubmit=async e=>{e.preventDefault();if(!$('checkText').value.trim())return;await insert('checklist_items',{ticket_id:id,testo:$('checkText').value.trim()},false);$('checkText').value='';checks()};
    checks();
  }
  comments();
}
function nav(v){
  const normalUserViews=['new','mine'];
  const hrViews=['hr-new','hr-history','hr-stats'];

  if(isHR()){
    if(!normalUserViews.includes(v)&&!hrViews.includes(v))return userHome();
  }else if(!isITRole()&&!normalUserViews.includes(v)){
    return userHome();
  }

  if(v==='home')home();
  else if(v==='new')newTicket();
  else if(v==='mine')mine();
  else if(v==='it')it();
  else if(v==='calendar')calendar();
  else if(v==='prenotazioni')bookings();
  else if(v==='movimenti')hrHistory();
  else if(v==='censimento')census();
  else if(v==='hr-new')hrNewMovement();
  else if(v==='hr-history')hrHistory();
  else if(v==='hr-stats')hrStats();
  else placeholder(v);
}
async function boot(){const raw=localStorage.getItem('archea_sd_session');if(raw){try{session=JSON.parse(raw);user=await api('/auth/v1/user')}catch{clear()}}if(!user){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}const p=await select('profiles',`select=*&id=eq.${user.id}`);if(!p.length){clear();$('loginErr').textContent='Profilo non trovato';return}profile=p[0];$('who').textContent=profile.nome||user.email;$('role').textContent=profile.ruolo;$('userNav').classList.toggle('hidden',isITRole()||isHR());
$('hrNav').classList.toggle('hidden',!isHR());
$('itNav').classList.toggle('hidden',!isITRole());$('login').classList.add('hidden');$('app').classList.remove('hidden');isITRole()?home():userHome();
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
