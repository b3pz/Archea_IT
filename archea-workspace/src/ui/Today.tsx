import { useMemo, useState } from 'react';
import { useStore } from './store';
import { Avatar, Empty, SearchBox } from './common';
import { TaskCard } from './TaskCard';
import { byUrgency, isOpen, taskStatus, type TaskStatus } from '../domain/taskRules';
import { firstName, isMine } from '../domain/people';
import { fmtDayLong } from '../domain/dates';
import { isManager, visibleTasks } from '../config/permissions';
import { ListIcon, Clock, Refresh } from './icons';
import { norm } from '../domain/projects';

type Filter = 'aperte' | 'in_scadenza' | 'scadute' | 'da_rivedere' | 'validate';
const FILTERS: [Filter, string][] = [['aperte', 'Aperte'], ['in_scadenza', 'In scadenza'], ['scadute', 'Scadute'], ['da_rivedere', 'Da rivedere'], ['validate', 'Validate']];
const PREVIEW = 5;

export function Today() {
  const { data, viewer, today } = useStore();
  const [filter, setFilter] = useState<Filter>('aperte');
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [scope, setScope] = useState<string>('me'); // 'me' | 'all' | personId (solo responsabile)
  const manager = !!viewer && isManager(viewer);

  const base = useMemo(() => {
    if (!data || !viewer) return [];
    const visible = visibleTasks(viewer, data.task, isMine);
    if (!manager || scope === 'me') return visible.filter((t) => isMine(t, viewer));
    if (scope === 'all') return visible;
    const p = data.persone.find((x) => x.id === scope);
    return p ? visible.filter((t) => isMine(t, p)) : visible;
  }, [data, viewer, scope, manager]);

  if (!data || !viewer) return null;
  const st = (t: (typeof base)[number]): TaskStatus => taskStatus(t, today);
  const counts: Record<Filter, number> = {
    aperte: base.filter((t) => isOpen(t, today)).length, in_scadenza: base.filter((t) => st(t) === 'in_scadenza').length,
    scadute: base.filter((t) => st(t) === 'scaduta').length, da_rivedere: base.filter((t) => st(t) === 'da_rivedere').length,
    validate: base.filter((t) => st(t) === 'validata').length,
  };
  const pass: Record<Filter, (t: (typeof base)[number]) => boolean> = {
    aperte: (t) => isOpen(t, today), in_scadenza: (t) => st(t) === 'in_scadenza', scadute: (t) => st(t) === 'scaduta',
    da_rivedere: (t) => st(t) === 'da_rivedere', validate: (t) => st(t) === 'validata',
  };
  const nq = norm(q);
  const list = base.filter(pass[filter]).filter((t) => !nq || norm([t.titolo, t.descrizione, t.progettoCodice, t.tipologia, t.assegnatario].join(' ')).includes(nq)).sort(byUrgency(today));
  const shown = all || nq ? list : list.slice(0, PREVIEW);
  const team = data.persone.filter((p) => p.inRiepiloghiOre);
  const scopeName = scope === 'me' ? 'Le tue task' : scope === 'all' ? 'Task del team' : `Task di ${firstName(data.persone.find((p) => p.id === scope)?.nome ?? '')}`;

  return (
    <>
      <div className="greet"><p className="hello">Ciao {firstName(viewer.nome)}</p><p className="date">{fmtDayLong(today)}</p></div>
      <h1 className="big">Il lavoro di oggi</h1>
      <div className="stats">
        <button className={`stat neutral${filter === 'aperte' ? ' on' : ''}`} onClick={() => setFilter('aperte')}><b>{counts.aperte}</b><ListIcon /><span>Aperte</span></button>
        <button className={`stat warn${filter === 'in_scadenza' ? ' on' : ''}`} onClick={() => setFilter('in_scadenza')}><b>{counts.in_scadenza}</b><Clock /><span>In scadenza</span></button>
        <button className={`stat alert${filter === 'da_rivedere' ? ' on' : ''}`} onClick={() => setFilter('da_rivedere')}><b>{counts.da_rivedere}</b><Refresh /><span>Da rivedere</span></button>
      </div>

      <div className="section-head"><h2>{scopeName}</h2>{list.length > PREVIEW && !nq && <button className="link" onClick={() => setAll(!all)}>{all ? 'Mostra meno' : 'Vedi tutte'}</button>}</div>
      <SearchBox value={q} onChange={setQ} placeholder="Cerca per titolo, progetto o tipologia" />
      <div className="chips" role="group" aria-label="Filtri task">
        {FILTERS.map(([k, l]) => <button key={k} className={`chip${filter === k ? ' on' : ''}${k === 'scadute' && counts.scadute ? ' hot' : ''}`} aria-pressed={filter === k} onClick={() => { setFilter(k); setAll(false); }}>{l} <i>{counts[k]}</i></button>)}
      </div>

      <div className="list">
        {shown.map((t) => <TaskCard key={t.id} t={t} />)}
        {!shown.length && <Empty>{nq ? 'Nessuna task corrisponde alla ricerca.' : 'Nessuna task in questa categoria.'}</Empty>}
      </div>

      {manager && (
        <>
          <div className="section-head"><h2>Il team</h2></div>
          <div className="team">
            <button className={`chip${scope === 'me' ? ' on' : ''}`} onClick={() => setScope('me')}>Mie</button>
            {team.filter((p) => p.id !== viewer.id).map((p) => <Avatar key={p.id} name={p.nome} size={48} active={scope === p.id} onClick={() => setScope(scope === p.id ? 'me' : p.id)} label={`Task di ${p.nome}`} />)}
            <button className={`chip${scope === 'all' ? ' on' : ''}`} onClick={() => setScope('all')}>Tutti</button>
          </div>
        </>
      )}
    </>
  );
}
