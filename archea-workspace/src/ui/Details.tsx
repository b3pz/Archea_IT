import { useState } from 'react';
import { useStore } from './store';
import { NoteBadge, Sheet, projectStatusClass } from './common';
import { TaskCard, DuePill } from './TaskCard';
import { NoteCard } from './Notes';
import { Copy, External, Paperclip } from './icons';
import { STATUS_LABEL, byUrgency, isOpen, taskStatus } from '../domain/taskRules';
import { fmtLong } from '../domain/dates';
import { visibleNotes, visibleTasks } from '../config/permissions';
import { isMine } from '../domain/people';

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="kv"><dt>{k}</dt><dd>{children}</dd></div>;
const isUrl = (s: string) => /^https?:\/\//i.test(s);

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return <button className="mini" onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }, () => undefined); }}><Copy /> {done ? 'Copiato' : 'Copia'}</button>;
}

export function TaskDetail({ id }: { id: string }) {
  const { data, today, close } = useStore();
  const t = data?.task.find((x) => x.id === id);
  if (!t || !data) return null;
  const st = taskStatus(t, today); const proj = data.progetti.find((p) => p.codice === t.progettoCodice);
  const done = t.completed ? (t.dataChiusura ? `Sì · chiusa il ${fmtLong(t.dataChiusura)}` : 'Sì · data di chiusura mancante') : 'No';
  const val = st === 'validata' ? 'Validata' : t.validated ? 'Segnata come validata ma non valida (manca completamento o data di chiusura)' : t.completed ? 'In attesa di validazione del responsabile' : 'Non validata';
  return (
    <Sheet title="Dettaglio task" onClose={close}>
      <p className="d-proj">{t.progettoCodice}{proj ? ` · ${proj.nome}` : ''}</p>
      <h3 className="d-title">{t.titolo || t.descrizione}</h3>
      <div className="d-badges"><span className={`tc-status s-${st}`}>{STATUS_LABEL[st]}</span><DuePill t={t} today={today} /></div>
      {t.titolo && t.descrizione && <p className="d-text">{t.descrizione}</p>}
      {t.commenti && <div className="callout"><b>Commenti</b><p>{t.commenti}</p></div>}
      <dl className="kvs">
        <Row k="Assegnata a">{t.assegnatario || '—'}</Row><Row k="Tipologia">{t.tipologia || '—'}</Row><Row k="Priorità">{t.priorita || '—'}</Row>
        <Row k="Inizio">{t.inizio ? fmtLong(t.inizio) : '—'}</Row><Row k="Scadenza">{t.scadenza ? fmtLong(t.scadenza) : '—'}</Row>
        {t.orario && <Row k="Orario">{t.orario}</Row>}
        <Row k="Completata">{done}</Row><Row k="Validazione">{val}</Row>
      </dl>
      {t.linkServer && (
        <><h4>Percorso server</h4>
          <div className="attach"><Paperclip /><span className="path">{t.linkServer}</span>{isUrl(t.linkServer) ? <a className="mini" href={t.linkServer} target="_blank" rel="noopener noreferrer"><External /> Apri</a> : <CopyButton text={t.linkServer} />}</div>
          {!isUrl(t.linkServer) && <p className="hint">Percorso interno dello studio: potrebbe non essere raggiungibile da iPhone.</p>}</>
      )}
      {t.immagini.length > 0 && (
        <><h4>Allegati ({t.immagini.length})</h4>
          {t.immagini.map((l, i) => (
            <div className="attach" key={i}><Paperclip /><span className="path">{isUrl(l) ? `Allegato ${i + 1}` : l}</span>
              {isUrl(l) ? <a className="mini" href={l} target="_blank" rel="noopener noreferrer"><External /> Apri in Google Drive</a> : <CopyButton text={l} />}</div>
          ))}
          <p className="hint">Nessuna anteprima: i file restano protetti dai permessi di Google Drive.</p></>
      )}
    </Sheet>
  );
}

export function ProjectDetail({ code }: { code: string }) {
  const { data, viewer, today, close } = useStore();
  const p = data?.progetti.find((x) => x.codice === code);
  if (!p || !data || !viewer) return null;
  const tasks = visibleTasks(viewer, data.task, isMine).filter((t) => t.progettoCodice === code);
  const open = tasks.filter((t) => isOpen(t, today)).sort(byUrgency(today)); const closed = tasks.length - open.length;
  const notes = visibleNotes(viewer, data.note).filter((n) => n.progettoCodice === code);
  return (
    <Sheet title={`${p.codice} · ${p.nome}`} onClose={close}>
      <div className="d-badges"><span className={`pill ${projectStatusClass(p.stato)}`}>{p.stato}</span>{!p.inElenco && <span className="pill ps-nd">Storico · assente da #DV</span>}</div>
      <div className="section-head"><h2>Task aperte ({open.length})</h2></div>
      <div className="list">{open.map((t) => <TaskCard key={t.id} t={t} showProject={false} />)}{!open.length && <p className="empty">Nessuna task aperta.</p>}</div>
      {closed > 0 && <p className="hint">{closed} {closed === 1 ? 'task chiusa' : 'task chiuse'} (validate) non mostrate.</p>}
      <div className="section-head"><h2>Note ({notes.length})</h2></div>
      <div className="list">{notes.map((n) => <NoteCard key={n.id} n={n} />)}{!notes.length && <p className="empty">Nessuna nota.</p>}</div>
    </Sheet>
  );
}

export function NoteDetail({ id }: { id: string }) {
  const { data, close } = useStore();
  const n = data?.note.find((x) => x.id === id); if (!n || !data) return null;
  const p = data.progetti.find((x) => x.codice === n.progettoCodice);
  return (
    <Sheet title="Nota" onClose={close}>
      <p className="d-proj">{n.progettoCodice}{p ? ` · ${p.nome}` : ''}</p>
      <div className="d-badges"><NoteBadge s={n.stato} /></div>
      <p className="d-text full">{n.testo}</p>
      <dl className="kvs"><Row k="Autore">{n.autore || '—'}</Row><Row k="Inserita il">{n.creata ? fmtLong(n.creata) : '—'}</Row>{n.stato === 'chiusa' && <Row k="Chiusa il">{n.chiusa ? fmtLong(n.chiusa) : '—'}</Row>}</dl>
    </Sheet>
  );
}
