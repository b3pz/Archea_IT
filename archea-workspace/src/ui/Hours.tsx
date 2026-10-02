import { useMemo, useState } from 'react';
import { useStore } from './store';
import { Avatar, Segmented } from './common';
import { ChevL, ChevR, Clock } from './icons';
import { fmtHours, periodFor, shiftAnchor, summarize, type PeriodKind } from '../domain/hours';
import { canViewHours, isManager } from '../config/permissions';
import { fmtLong, fmtShort, isISO } from '../domain/dates';
import { norm } from '../domain/projects';

const KINDS: [PeriodKind, string][] = [['giorno', 'Giorno'], ['settimana', 'Sett.'], ['mese', 'Mese'], ['anno', 'Anno'], ['custom', 'Custom']];
const niceMax = (v: number) => { const steps = [4, 8, 12, 16, 20, 40, 80, 160, 320, 640, 1280]; return steps.find((s) => s >= v) ?? Math.ceil(v / 100) * 100; };

export function Hours() {
  const { data, viewer, today } = useStore();
  const [kind, setKind] = useState<PeriodKind>('settimana');
  const [anchor, setAnchor] = useState(today);
  const [custom, setCustom] = useState({ from: today.slice(0, 8) + '01', to: today });
  const [targetId, setTargetId] = useState<string | null>(null);

  const candidates = useMemo(() => (data && viewer ? data.persone.filter((p) => p.inRiepiloghiOre && canViewHours(viewer, p)) : []), [data, viewer]);
  const target = candidates.find((p) => p.id === targetId) ?? candidates.find((p) => p.id === viewer?.id) ?? candidates[0];
  const regs = useMemo(() => (data && target ? data.ore.filter((r) => norm(r.persona) === norm(target.nome)) : []), [data, target]);
  const period = periodFor(kind, anchor, custom);
  const sum = useMemo(() => summarize(regs, period), [regs, period.from, period.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const dayOnly = useMemo(() => summarize(regs, periodFor('giorno', today)).totale, [regs, today]);
  if (!data || !viewer) return null;
  if (!target) return <><h1 className="big title-row">Le mie ore</h1><p className="empty">Nessuna ora disponibile per questa persona.</p></>;

  const max = niceMax(Math.max(0, ...sum.barre.map((b) => b.ore)));
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const totalAll = regs.reduce((s, r) => s + r.ore, 0);
  const many = sum.barre.length > 12;
  const projName = (c: string) => data.progetti.find((p) => p.codice === c)?.nome ?? '';
  const maxProj = Math.max(0, ...sum.perProgetto.map((p) => p.ore));
  const setDate = (v: string) => isISO(v) && setAnchor(v);

  return (
    <>
      <h1 className="big title-row">{target.id === viewer.id ? 'Le mie ore' : `Ore · ${target.nome.split(' ')[0]}`}</h1>
      <p className="sub">{target.nome}</p>
      {isManager(viewer) && candidates.length > 1 && (
        <div className="team compact">{candidates.map((p) => <Avatar key={p.id} name={p.nome} size={40} active={p.id === target.id} onClick={() => setTargetId(p.id)} label={`Ore di ${p.nome}`} />)}</div>
      )}
      <Segmented<PeriodKind> label="Periodo" value={kind} onChange={setKind} options={KINDS} />
      {kind === 'custom' ? (
        <div className="range-row">
          <label>Dal<input type="date" value={custom.from} onChange={(e) => isISO(e.target.value) && setCustom({ ...custom, from: e.target.value })} /></label>
          <label>Al<input type="date" value={custom.to} onChange={(e) => isISO(e.target.value) && setCustom({ ...custom, to: e.target.value })} /></label>
        </div>
      ) : (
        <div className="nav-row">
          <button className="icon-btn" onClick={() => setAnchor(shiftAnchor(kind, anchor, -1))} aria-label="Periodo precedente"><ChevL /></button>
          <label className="date-pick"><span>{period.label}</span><input type="date" value={anchor} onChange={(e) => setDate(e.target.value)} aria-label="Scegli una data dal calendario" /></label>
          <button className="icon-btn" onClick={() => setAnchor(shiftAnchor(kind, anchor, 1))} aria-label="Periodo successivo"><ChevR /></button>
        </div>
      )}
      {kind === 'settimana' && <p className="hint">Settimana di calendario, lunedì–domenica.</p>}

      <div className="total"><b>{fmtHours(sum.totale)}</b><span>{kind === 'custom' ? `Dal ${fmtShort(period.from)} al ${fmtShort(period.to)}` : { giorno: 'In questo giorno', settimana: 'Questa settimana', mese: 'In questo mese', anno: 'In quest’anno' }[kind]}</span></div>

      <div className="chart" role="img" aria-label={`Ore per ${sum.barre.length > 12 ? 'periodo' : 'giorno'}`}>
        <div className="y">{ticks.slice().reverse().map((t) => <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>{Number.isInteger(t) ? t : t.toFixed(1)}</span>)}</div>
        <div className="plot">
          {ticks.map((t) => <i key={t} className="grid" style={{ bottom: `${(t / max) * 100}%` }} />)}
          <div className="bars">{sum.barre.map((b, i) => (
            <div key={b.key} className="bar-col" title={`${b.key}: ${fmtHours(b.ore)}`}>
              <span className="bar" style={{ height: `${(b.ore / max) * 100}%` }} />
              <em className={many && i % 5 !== 0 && i !== sum.barre.length - 1 ? 'hide' : ''}>{b.label}</em>
            </div>))}</div>
        </div>
      </div>

      <div className="section-head"><h2>Per progetto</h2></div>
      <div className="by-proj">
        {sum.perProgetto.map((p) => (
          <div key={p.codice} className="bp-row"><span className="bp-name"><b>{p.codice}</b> · {projName(p.codice)}</span><span className="bp-bar"><i style={{ width: `${(p.ore / maxProj) * 100}%` }} /></span><span className="bp-h">{fmtHours(p.ore)}</span></div>
        ))}
        {!sum.perProgetto.length && <p className="empty">Nessuna ora registrata nel periodo.</p>}
      </div>

      <button className="today-card" onClick={() => { setKind('giorno'); setAnchor(today); }}>
        <span className="tc-ico"><Clock /></span><span><small>Oggi · {fmtLong(today).replace(/ \d{4}$/, '')}</small><b>{fmtHours(dayOnly)} registrate</b></span><ChevR />
      </button>
      <p className="hint">Totale storico registrato: {fmtHours(totalAll)}. Le ore di {data.persone.filter((p) => !p.inRiepiloghiOre).length ? 'alcune persone' : 'altre persone'} sono escluse dai riepiloghi concordati.</p>
    </>
  );
}
