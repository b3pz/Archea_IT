
const URL='https://igfpkpcksllmqofkoxkf.supabase.co';
const KEY='sb_publishable_wuq5rwy4w6ca7nvJTbrXzA_izhCmrf9';
const db=window.supabase.createClient(URL,KEY);
let user=null,profile=null,currentId=null;
const $=x=>document.getElementById(x);
const esc=s=>(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fmt=d=>d?new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short'}).format(new Date(d)):'—';
const num=id=>`TKT-${new Date().getFullYear()}-${String(id).padStart(5,'0')}`;
const badge=s=>`<span class="badge ${s==='APERTO'?'open':s==='IN LAVORAZIONE'?'working':s==='CHIUSO'?'closed':''}">${s}</span>`;
function toast(t){$('toast').textContent=t;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),2200)}
function page(t,s=''){$('title').textContent=t;$('subtitle').textContent=s}
function table(rows,it=false){if(!rows.length)return '<p>Nessun ticket.</p>';return `<div class="tablewrap"><table><thead><tr><th>Ticket</th>${it?'<th>Richiedente</th>':''}<th>Categoria</th><th>Oggetto</th><th>Stato</th><th>Data</th></tr></thead><tbody>${rows.map(x=>`<tr class="click" data-id="${x.id}"><td><b>${x.numero_ticket||num(x.id)}</b></td>${it?`<td>${esc(x.richiedente_nome||x.richiedente_email)}</td>`:''}<td>${esc(x.categoria)}</td><td>${esc(x.oggetto)}</td><td>${badge(x.stato)}</td><td>${fmt(x.created_at)}</td></tr>`).join('')}</tbody></table></div>`}
function wireRows(){document.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>detail(+r.dataset.id))}
async function home(){
 page('Dashboard','Panoramica del Service Desk');
 let q=db.from('tickets').select('*').order('created_at',{ascending:false}); if(profile.ruolo!=='IT') q=q.eq('richiedente_email',user.email);
 const {data=[],error}=await q;if(error)return toast(error.message);
 $('content').innerHTML=`<div class="hero"><div><h3>Come possiamo aiutarti?</h3><p>Apri una richiesta e segui lo stato.</p></div><button id="quick">Apri ticket</button></div>
 <div class="metrics"><div class="metric"><span>Aperti</span><b>${data.filter(x=>x.stato==='APERTO').length}</b></div><div class="metric"><span>In lavorazione</span><b>${data.filter(x=>x.stato==='IN LAVORAZIONE').length}</b></div><div class="metric"><span>Chiusi</span><b>${data.filter(x=>x.stato==='CHIUSO').length}</b></div><div class="metric"><span>Totale</span><b>${data.length}</b></div></div>
 <div class="panel"><h3>Ticket recenti</h3>${table(data.slice(0,8),profile.ruolo==='IT')}</div>`;
 $('quick').onclick=()=>nav('new');wireRows()
}
function newTicket(){
 page('Nuovo ticket','Apri una richiesta al team IT');
 $('content').innerHTML=`<div class="panel"><form id="ticketForm" class="formgrid">
 <label>Categoria<select id="cat" required><option value="">Seleziona...</option><option>Supporto IT</option><option>Installazioni</option><option>Manutenzioni</option><option>Hardware</option><option>Accessi</option><option>Rete / Wi-Fi</option><option>Movimento persona</option><option>Prenotazione materiale</option><option>Altro</option></select></label>
 <label>Oggetto<input id="sub" required></label><label class="full">Descrizione<textarea id="desc" rows="8" required></textarea></label><div class="full"><button>Invia ticket</button></div></form><p id="result"></p></div>`;
 $('ticketForm').onsubmit=async e=>{e.preventDefault();const {data,error}=await db.from('tickets').insert({categoria:$('cat').value,oggetto:$('sub').value.trim(),descrizione:$('desc').value.trim(),stato:'APERTO',richiedente_nome:profile.nome,richiedente_email:user.email}).select().single();if(error)return $('result').textContent=error.message;const n=num(data.id);await db.from('tickets').update({numero_ticket:n}).eq('id',data.id);await db.from('ticket_history').insert({ticket_id:data.id,evento:'Ticket creato',autore:profile.nome});$('ticketForm').reset();$('result').textContent=`Ticket ${n} creato.`;toast('Ticket creato')}
}
async function mine(){page('I miei ticket','Storico delle tue richieste');const {data=[],error}=await db.from('tickets').select('*').eq('richiedente_email',user.email).order('created_at',{ascending:false});if(error)return toast(error.message);$('content').innerHTML=`<div class="panel">${table(data)}</div>`;wireRows()}
async function it(){if(profile.ruolo!=='IT')return home();page('Gestione IT','Tutti i ticket');const {data=[],error}=await db.from('tickets').select('*').order('created_at',{ascending:false});if(error)return toast(error.message);$('content').innerHTML=`<div class="panel">${table(data,true)}</div>`;wireRows()}
function placeholder(k){const m={movimenti:['Movimenti','Ingressi, uscite, cambi postazione e sede, collegati al file HR con controllo anti-duplicati.'],prenotazioni:['Prenotazioni','Disponibilità materiale, calendario e verbale di consegna stampabile.'],censimento:['Censimento','Inventario asset, assegnazioni, stato, storico e verifica progressiva.']};page(m[k][0],m[k][1]);$('content').innerHTML=`<div class="panel"><h3>${m[k][0]}</h3><p>${m[k][1]}</p><span class="badge">Prossima fase</span></div>`}
async function detail(id){
 currentId=id;page('Dettaglio ticket','Conversazione e avanzamento');
 const {data:t,error}=await db.from('tickets').select('*').eq('id',id).single();if(error)return toast(error.message);
 if(profile.ruolo!=='IT'&&t.richiedente_email!==user.email)return toast('Non autorizzato');
 $('content').innerHTML=`<div class="panel"><div style="display:flex;justify-content:space-between;gap:20px"><div><span class="badge">${t.numero_ticket||num(t.id)}</span><h3>${esc(t.oggetto)}</h3><p>${esc(t.categoria)} • ${esc(t.richiedente_nome||t.richiedente_email)} • ${fmt(t.created_at)}</p></div>${badge(t.stato)}</div><p style="white-space:pre-wrap">${esc(t.descrizione)}</p></div>
 ${profile.ruolo==='IT'?`<div class="panel"><h3>Gestione IT</h3><div class="formgrid"><label>Stato<select id="st"><option>APERTO</option><option>IN LAVORAZIONE</option><option>IN ATTESA</option><option>CHIUSO</option></select></label><label>Assegnato a<input id="ass"></label><div class="full"><button id="save">Salva</button></div></div></div>`:''}
 <div class="panel"><h3>Commenti</h3><div id="comments"></div><form id="commentForm"><label>Commento<textarea id="ct" rows="3" required></textarea></label>${profile.ruolo==='IT'?'<label style="display:flex;align-items:center;gap:8px"><input id="internal" type="checkbox" style="width:auto"> Nota interna IT</label>':''}<button>Invia commento</button></form></div>
 ${profile.ruolo==='IT'?`<div class="panel"><h3>Checklist IT</h3><div id="checks"></div><form id="checkForm"><label>Nuova attività<input id="checkText"></label><button>Aggiungi</button></form></div>`:''}`;
 if(profile.ruolo==='IT'){$('st').value=t.stato;$('ass').value=t.assegnato_a||'';$('save').onclick=async()=>{const stato=$('st').value;const patch={stato,assegnato_a:$('ass').value.trim()||null};if(stato==='CHIUSO')patch.closed_at=new Date().toISOString();const {error}=await db.from('tickets').update(patch).eq('id',id);if(error)return toast(error.message);await db.from('ticket_history').insert({ticket_id:id,evento:`Stato aggiornato: ${stato}`,autore:profile.nome});toast('Aggiornato');detail(id)}}
 async function comments(){const {data=[]}=await db.from('comments').select('*').eq('ticket_id',id).order('created_at');const v=profile.ruolo==='IT'?data:data.filter(x=>!x.nota_interna);$('comments').innerHTML=v.length?v.map(x=>`<div class="comment ${x.nota_interna?'internal':''}"><b>${esc(x.autore)}${x.nota_interna?' • Nota interna':''}</b><small style="float:right">${fmt(x.created_at)}</small><p>${esc(x.testo)}</p></div>`).join(''):'<p>Nessun commento.</p>'}
 $('commentForm').onsubmit=async e=>{e.preventDefault();const {error}=await db.from('comments').insert({ticket_id:id,autore:profile.nome,autore_email:user.email,testo:$('ct').value.trim(),nota_interna:profile.ruolo==='IT'&&$('internal').checked});if(error)return toast(error.message);$('ct').value='';comments()}
 if(profile.ruolo==='IT'){async function checks(){const {data=[]}=await db.from('checklist_items').select('*').eq('ticket_id',id).order('id');$('checks').innerHTML=data.length?data.map(x=>`<label class="check"><input type="checkbox" data-c="${x.id}" ${x.completato?'checked':''}><span>${esc(x.testo)}</span></label>`).join(''):'<p>Nessuna attività.</p>';document.querySelectorAll('[data-c]').forEach(c=>c.onchange=()=>db.from('checklist_items').update({completato:c.checked,completed_at:c.checked?new Date().toISOString():null,completed_by:c.checked?profile.nome:null}).eq('id',+c.dataset.c))}
 $('checkForm').onsubmit=async e=>{e.preventDefault();if(!$('checkText').value.trim())return;await db.from('checklist_items').insert({ticket_id:id,testo:$('checkText').value.trim()});$('checkText').value='';checks()};checks()}
 comments()
}
function nav(v){if(v==='home')home();else if(v==='new')newTicket();else if(v==='mine')mine();else if(v==='it')it();else placeholder(v)}
async function boot(){const {data:{session}}=await db.auth.getSession();if(!session){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}user=session.user;const {data,error}=await db.from('profiles').select('*').eq('id',user.id).single();if(error){await db.auth.signOut();return $('loginErr').textContent='Profilo non trovato.'}profile=data;$('who').textContent=profile.nome||user.email;$('role').textContent=profile.ruolo;$('itNav').classList.toggle('hidden',profile.ruolo!=='IT');$('login').classList.add('hidden');$('app').classList.remove('hidden');home()}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginErr').textContent='';const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return $('loginErr').textContent=error.message;boot()}
$('logout').onclick=async()=>{await db.auth.signOut();location.reload()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>nav(b.dataset.view));
boot();
