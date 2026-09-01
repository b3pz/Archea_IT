
const BASE='https://igfpkpcksllmofqfkoxkf.supabase.co';
const KEY='sb_publishable_wuq5rwy4w6ca7nvJTbrXzA_izhCmrf9';

let session=null,user=null,profile=null;
const $=id=>document.getElementById(id);
const esc=s=>(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fmt=d=>d?new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short'}).format(new Date(d)):'—';
const num=id=>`TKT-${new Date().getFullYear()}-${String(id).padStart(5,'0')}`;
const badge=s=>`<span class="badge ${s==='APERTO'?'open':s==='IN LAVORAZIONE'?'working':s==='CHIUSO'?'closed':''}">${esc(s)}</span>`;

function toast(t){$('toast').textContent=t;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),2200)}
function page(t,s=''){$('title').textContent=t;$('subtitle').textContent=s}
function saveSession(s){session=s;localStorage.setItem('archea_sd_session',JSON.stringify(s))}
function clearSession(){session=null;user=null;profile=null;localStorage.removeItem('archea_sd_session')}
function getSaved(){try{return JSON.parse(localStorage.getItem('archea_sd_session')||'null')}catch{return null}}

async function api(path,{method='GET',body=null,auth=true,headers={}}={}){
  const h={'apikey':KEY,'Content-Type':'application/json',...headers};
  if(auth&&session?.access_token) h['Authorization']='Bearer '+session.access_token;
  const r=await fetch(BASE+path,{method,headers:h,body:body?JSON.stringify(body):null});
  const txt=await r.text();
  let data=null; try{data=txt?JSON.parse(txt):null}catch{data=txt}
  if(!r.ok){
    const msg=(data&&((data.msg)||(data.message)||(data.error_description)||(data.error)))||`HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

async function login(email,password){
  const data=await api('/auth/v1/token?grant_type=password',{
    method:'POST',auth:false,body:{email,password}
  });
  saveSession(data);
  user=data.user;
}

async function loadUserFromSession(){
  const saved=getSaved();
  if(!saved?.access_token) return false;
  session=saved;
  try{
    user=await api('/auth/v1/user');
    return true;
  }catch{
    clearSession();
    return false;
  }
}

async function select(table,query=''){
  return await api(`/rest/v1/${table}?${query}`,{headers:{'Accept':'application/json'}});
}
async function insert(table,body,returnRows=true){
  return await api(`/rest/v1/${table}`,{
    method:'POST',body,headers:{'Prefer':returnRows?'return=representation':'return=minimal'}
  });
}
async function update(table,filter,body){
  return await api(`/rest/v1/${table}?${filter}`,{
    method:'PATCH',body,headers:{'Prefer':'return=representation'}
  });
}

function table(rows,it=false){
  if(!rows.length)return '<p>Nessun ticket.</p>';
  return `<div class="tablewrap"><table><thead><tr><th>Ticket</th>${it?'<th>Richiedente</th>':''}<th>Categoria</th><th>Oggetto</th><th>Stato</th><th>Data</th></tr></thead><tbody>
  ${rows.map(x=>`<tr class="click" data-id="${x.id}"><td><b>${x.numero_ticket||num(x.id)}</b></td>${it?`<td>${esc(x.richiedente_nome||x.richiedente_email)}</td>`:''}<td>${esc(x.categoria)}</td><td>${esc(x.oggetto)}</td><td>${badge(x.stato)}</td><td>${fmt(x.created_at)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function wireRows(){document.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>detail(+r.dataset.id))}

async function home(){
  page('Dashboard','Panoramica del Service Desk');
  let q='select=*&order=created_at.desc';
  if(profile.ruolo!=='IT') q+=`&richiedente_email=eq.${encodeURIComponent(user.email)}`;
  const data=await select('tickets',q);
  $('content').innerHTML=`<div class="hero"><div><h3>Come possiamo aiutarti?</h3><p>Apri una richiesta e segui lo stato.</p></div><button id="quick">Apri ticket</button></div>
  <div class="metrics">
    <div class="metric"><span>Aperti</span><b>${data.filter(x=>x.stato==='APERTO').length}</b></div>
    <div class="metric"><span>In lavorazione</span><b>${data.filter(x=>x.stato==='IN LAVORAZIONE').length}</b></div>
    <div class="metric"><span>Chiusi</span><b>${data.filter(x=>x.stato==='CHIUSO').length}</b></div>
    <div class="metric"><span>Totale</span><b>${data.length}</b></div>
  </div>
  <div class="panel"><h3>Ticket recenti</h3>${table(data.slice(0,8),profile.ruolo==='IT')}</div>`;
  $('quick').onclick=()=>nav('new');wireRows();
}

function newTicket(){
  page('Nuovo ticket','Apri una richiesta al team IT');
  $('content').innerHTML=`<div class="panel"><form id="ticketForm" class="formgrid">
  <label>Categoria<select id="cat" required><option value="">Seleziona...</option><option>Supporto IT</option><option>Installazioni</option><option>Manutenzioni</option><option>Hardware</option><option>Accessi</option><option>Rete / Wi-Fi</option><option>Movimento persona</option><option>Prenotazione materiale</option><option>Altro</option></select></label>
  <label>Oggetto<input id="sub" required></label>
  <label class="full">Descrizione<textarea id="desc" rows="8" required></textarea></label>
  <div class="full"><button>Invia ticket</button></div></form><p id="result"></p></div>`;
  $('ticketForm').onsubmit=async e=>{
    e.preventDefault();
    try{
      const rows=await insert('tickets',{categoria:$('cat').value,oggetto:$('sub').value.trim(),descrizione:$('desc').value.trim(),stato:'APERTO',richiedente_nome:profile.nome,richiedente_email:user.email});
      const data=rows[0];
      const n=num(data.id);
      await update('tickets',`id=eq.${data.id}`,{numero_ticket:n});
      await insert('ticket_history',{ticket_id:data.id,evento:'Ticket creato',autore:profile.nome},false);
      $('ticketForm').reset();$('result').textContent=`Ticket ${n} creato.`;toast('Ticket creato');
    }catch(err){$('result').textContent=err.message}
  };
}

async function mine(){
  page('I miei ticket','Storico delle tue richieste');
  const data=await select('tickets',`select=*&richiedente_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc`);
  $('content').innerHTML=`<div class="panel">${table(data)}</div>`;wireRows();
}
async function it(){
  if(profile.ruolo!=='IT')return home();
  page('Gestione IT','Tutti i ticket');
  const data=await select('tickets','select=*&order=created_at.desc');
  $('content').innerHTML=`<div class="panel">${table(data,true)}</div>`;wireRows();
}
function placeholder(k){
  const m={
    movimenti:['Movimenti','Ingressi, uscite, cambi postazione e sede, collegati al file HR con controllo anti-duplicati.'],
    prenotazioni:['Prenotazioni','Disponibilità materiale, calendario e verbale di consegna stampabile.'],
    censimento:['Censimento','Inventario asset, assegnazioni, stato, storico e verifica progressiva.']
  };
  page(m[k][0],m[k][1]);
  $('content').innerHTML=`<div class="panel"><h3>${m[k][0]}</h3><p>${m[k][1]}</p><span class="badge">Prossima fase</span></div>`;
}

async function detail(id){
  page('Dettaglio ticket','Conversazione e avanzamento');
  const rows=await select('tickets',`select=*&id=eq.${id}`);
  if(!rows.length)return toast('Ticket non trovato');
  const t=rows[0];
  if(profile.ruolo!=='IT'&&t.richiedente_email!==user.email)return toast('Non autorizzato');

  $('content').innerHTML=`<div class="panel"><div style="display:flex;justify-content:space-between;gap:20px"><div>
    <span class="badge">${t.numero_ticket||num(t.id)}</span><h3>${esc(t.oggetto)}</h3>
    <p>${esc(t.categoria)} • ${esc(t.richiedente_nome||t.richiedente_email)} • ${fmt(t.created_at)}</p></div>${badge(t.stato)}</div>
    <p style="white-space:pre-wrap">${esc(t.descrizione)}</p></div>
    ${profile.ruolo==='IT'?`<div class="panel"><h3>Gestione IT</h3><div class="formgrid">
    <label>Stato<select id="st"><option>APERTO</option><option>IN LAVORAZIONE</option><option>IN ATTESA</option><option>CHIUSO</option></select></label>
    <label>Assegnato a<input id="ass"></label><div class="full"><button id="save">Salva</button></div></div></div>`:''}
    <div class="panel"><h3>Commenti</h3><div id="comments"></div>
    <form id="commentForm"><label>Commento<textarea id="ct" rows="3" required></textarea></label>
    ${profile.ruolo==='IT'?'<label style="display:flex;align-items:center;gap:8px"><input id="internal" type="checkbox" style="width:auto"> Nota interna IT</label>':''}
    <button>Invia commento</button></form></div>
    ${profile.ruolo==='IT'?`<div class="panel"><h3>Checklist IT</h3><div id="checks"></div><form id="checkForm"><label>Nuova attività<input id="checkText"></label><button>Aggiungi</button></form></div>`:''}`;

  if(profile.ruolo==='IT'){
    $('st').value=t.stato;$('ass').value=t.assegnato_a||'';
    $('save').onclick=async()=>{
      const stato=$('st').value;
      const patch={stato,assegnato_a:$('ass').value.trim()||null};
      if(stato==='CHIUSO')patch.closed_at=new Date().toISOString();
      await update('tickets',`id=eq.${id}`,patch);
      await insert('ticket_history',{ticket_id:id,evento:`Stato aggiornato: ${stato}`,autore:profile.nome},false);
      toast('Aggiornato');detail(id);
    };
  }

  async function comments(){
    const data=await select('comments',`select=*&ticket_id=eq.${id}&order=created_at.asc`);
    const v=profile.ruolo==='IT'?data:data.filter(x=>!x.nota_interna);
    $('comments').innerHTML=v.length?v.map(x=>`<div class="comment ${x.nota_interna?'internal':''}">
      <b>${esc(x.autore)}${x.nota_interna?' • Nota interna':''}</b><small style="float:right">${fmt(x.created_at)}</small><p>${esc(x.testo)}</p></div>`).join(''):'<p>Nessun commento.</p>';
  }
  $('commentForm').onsubmit=async e=>{
    e.preventDefault();
    await insert('comments',{ticket_id:id,autore:profile.nome,autore_email:user.email,testo:$('ct').value.trim(),nota_interna:profile.ruolo==='IT'&&$('internal').checked},false);
    $('ct').value='';comments();
  };

  if(profile.ruolo==='IT'){
    async function checks(){
      const data=await select('checklist_items',`select=*&ticket_id=eq.${id}&order=id.asc`);
      $('checks').innerHTML=data.length?data.map(x=>`<label class="check"><input type="checkbox" data-c="${x.id}" ${x.completato?'checked':''}><span>${esc(x.testo)}</span></label>`).join(''):'<p>Nessuna attività.</p>';
      document.querySelectorAll('[data-c]').forEach(c=>c.onchange=()=>update('checklist_items',`id=eq.${+c.dataset.c}`,{completato:c.checked,completed_at:c.checked?new Date().toISOString():null,completed_by:c.checked?profile.nome:null}));
    }
    $('checkForm').onsubmit=async e=>{e.preventDefault();if(!$('checkText').value.trim())return;await insert('checklist_items',{ticket_id:id,testo:$('checkText').value.trim()},false);$('checkText').value='';checks()};
    checks();
  }
  comments();
}

function nav(v){if(v==='home')home();else if(v==='new')newTicket();else if(v==='mine')mine();else if(v==='it')it();else placeholder(v)}

async function boot(){
  const ok=await loadUserFromSession();
  if(!ok){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}
  try{
    const rows=await select('profiles',`select=*&id=eq.${user.id}`);
    if(!rows.length) throw new Error('Profilo non trovato nella tabella profiles.');
    profile=rows[0];
    $('who').textContent=profile.nome||user.email;$('role').textContent=profile.ruolo;
    $('itNav').classList.toggle('hidden',profile.ruolo!=='IT');
    $('login').classList.add('hidden');$('app').classList.remove('hidden');home();
  }catch(err){
    clearSession();$('loginErr').textContent=err.message;
  }
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  $('loginErr').textContent='';
  try{
    await login($('email').value.trim(),$('password').value);
    await boot();
  }catch(err){
    $('loginErr').textContent=err.message;
  }
});
$('logout').onclick=()=>{clearSession();location.reload()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>nav(b.dataset.view));

window.addEventListener('error',e=>{
  $('debugBox').classList.remove('hidden');
  $('debugBox').textContent='Errore JavaScript:\\n'+e.message;
});
window.addEventListener('unhandledrejection',e=>{
  $('debugBox').classList.remove('hidden');
  $('debugBox').textContent='Errore asincrono:\\n'+(e.reason?.message||String(e.reason));
});

boot();
