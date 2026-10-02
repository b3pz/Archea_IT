import { useMemo, useState } from 'react';
import { useStore } from './store';
import { Avatar, Empty, NoteBadge, SearchBox, Sheet, projectStatusClass } from './common';
import { ChevD } from './icons';
import { visibleNotes, visibleProjects } from '../config/permissions';
import { fmtLong } from '../domain/dates';
import { norm } from '../domain/projects';
import type { Nota } from '../domain/types';

export function NoteCard({ n }: { n: Nota }) {
  const { open } = useStore();
  return (
    <button className={`note-card${n.stato === 'chiusa' ? ' closed' : ''}`} onClick={() => open({ kind: 'note', id: n.id })}>
      <span className="nc-head"><Avatar name={n.autore || '?'} size={36} /><span className="nc-who"><b>{n.autore || 'Autore non indicato'}</b><small>{n.creata ? fmtLong(n.creata) : 'Data non indicata'}</small></span><NoteBadge s={n.stato} /></span>
      <span className="nc-text">{n.testo}</span>
      {n.stato === 'chiusa' && n.chiusa && <small className="nc-closed">Chiusa il {fmtLong(n.chiusa)}</small>}
    </button>
  );
}

export function Notes() {
  const { data, viewer, noteProject, setNoteProject } = useStore();
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState('');
  const projects = useMemo(() => (data && viewer ? visibleProjects(viewer, data.progetti) : []), [data, viewer]);
  if (!data || !viewer) return null;
  const notes = visibleNotes(viewer, data.note);
  const current = projects.find((p) => p.codice === noteProject) ?? projects.find((p) => notes.some((n) => n.progettoCodice === p.codice)) ?? projects[0];
  const mine = current ? notes.filter((n) => n.progettoCodice === current.codice) : [];
  const openN = mine.filter((n) => n.stato !== 'chiusa'), closedN = mine.filter((n) => n.stato === 'chiusa');
  const nq = norm(q);
  const noteCount = (c: string) => notes.filter((n) => n.progettoCodice === c).length;
  return (
    <>
      <h1 className="big title-row">Taccuino</h1>
      <button className="picker" onClick={() => setPicker(true)} aria-haspopup="dialog"><span>{current ? `${current.codice} · ${current.nome}` : 'Nessun progetto'}</span><ChevD /></button>
      <p className="hint">Sola lettura: le note si leggono qui, si scrivono nel foglio.</p>
      <div className="section-head"><h2>Note aperte</h2></div>
      <div className="list">{openN.map((n) => <NoteCard key={n.id} n={n} />)}{!openN.length && <Empty>Nessuna nota aperta per questo progetto.</Empty>}</div>
      <div className="section-head"><h2>Note chiuse</h2></div>
      <div className="list">{closedN.map((n) => <NoteCard key={n.id} n={n} />)}{!closedN.length && <Empty>Nessuna nota chiusa.</Empty>}</div>
      {picker && (
        <Sheet title="Scegli progetto" onClose={() => setPicker(false)}>
          <SearchBox value={q} onChange={setQ} placeholder="Cerca per codice o nome" />
          <div className="list tight">
            {projects.filter((p) => !nq || norm(`${p.codice} ${p.nome}`).includes(nq)).map((p) => (
              <button key={p.id} className={`pick-row${p.codice === current?.codice ? ' on' : ''}`} onClick={() => { setNoteProject(p.codice); setPicker(false); setQ(''); }}>
                <b>{p.codice}</b><span>{p.nome}</span><span className={`pill ${projectStatusClass(p.stato)}`}>{p.stato}</span><small>{noteCount(p.codice)} note</small>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
