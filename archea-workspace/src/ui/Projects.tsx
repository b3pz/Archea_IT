import { useMemo, useState } from 'react';
import { useStore } from './store';
import { Empty, Segmented, SearchBox, projectStatusClass } from './common';
import { Building, NoteIcon, ListIcon } from './icons';
import { isManager, visibleNotes, visibleProjects, visibleTasks } from '../config/permissions';
import { isMine } from '../domain/people';
import { isOpen } from '../domain/taskRules';
import { norm } from '../domain/projects';

/** Conteggi per progetto: "pressione di lavoro" = task attualmente aperte (non storico, non ore stimate). */
export function useProjectCounts() {
  const { data, viewer, today } = useStore();
  return useMemo(() => {
    const m = new Map<string, { tasks: number; notes: number }>();
    if (!data || !viewer) return m;
    const bump = (c: string, k: 'tasks' | 'notes') => m.set(c, { ...(m.get(c) ?? { tasks: 0, notes: 0 }), [k]: (m.get(c)?.[k] ?? 0) + 1 });
    visibleTasks(viewer, data.task, isMine).filter((t) => isOpen(t, today)).forEach((t) => bump(t.progettoCodice, 'tasks'));
    visibleNotes(viewer, data.note).filter((n) => n.stato !== 'chiusa').forEach((n) => bump(n.progettoCodice, 'notes'));
    return m;
  }, [data, viewer, today]);
}

export function Projects() {
  const { data, viewer, open } = useStore();
  const [scope, setScope] = useState<'attivi' | 'tutti'>('attivi');
  const [q, setQ] = useState('');
  const counts = useProjectCounts();
  if (!data || !viewer) return null;
  const nq = norm(q);
  const list = visibleProjects(viewer, data.progetti).filter((p) => (scope === 'tutti' || p.stato.toLowerCase() === 'attivo') && (!nq || norm(`${p.codice} ${p.nome}`).includes(nq)));
  return (
    <>
      <h1 className="big title-row">Progetti</h1>
      <SearchBox value={q} onChange={setQ} placeholder="Cerca un progetto" />
      <Segmented<'attivi' | 'tutti'> label="Filtro progetti" value={scope} onChange={setScope} options={[['attivi', 'Attivi'], ['tutti', 'Tutti']]} />
      {!isManager(viewer) && <p className="hint">Elenco condiviso con tutti i membri (da confermare).</p>}
      <div className="list">
        {list.map((p) => {
          const c = counts.get(p.codice) ?? { tasks: 0, notes: 0 };
          return (
            <button key={p.id} className="proj-card" onClick={() => open({ kind: 'project', id: p.codice })}>
              <span className="thumb"><Building /></span>
              <span className="pc-main">
                <span className="pc-top"><b>{p.codice}</b><span className={`pill ${projectStatusClass(p.stato)}`}>{p.stato}</span></span>
                <span className="pc-name">{p.nome}</span>
                <span className="pc-meta"><span><ListIcon /> {c.tasks} task aperte</span><span><NoteIcon size={18} /> {c.notes} {c.notes === 1 ? 'nota' : 'note'}</span></span>
              </span>
            </button>
          );
        })}
        {!list.length && <Empty>Nessun progetto trovato.</Empty>}
      </div>
    </>
  );
}
