import type { Task } from '../domain/types';
import { dueIndicator, STATUS_LABEL, taskStatus } from '../domain/taskRules';
import { fmtShort } from '../domain/dates';
import { StatusIcon } from './icons';
import { useStore } from './store';

export function DuePill({ t, today }: { t: Task; today: string }) {
  const due = dueIndicator(t, today);
  if (due.kind === 'none' || taskStatus(t, today) === 'validata') return null;
  const label = due.kind === 'overdue' ? `Scaduta · ${-due.days} g` : due.kind === 'today' ? 'Oggi' : due.kind === 'tomorrow' ? 'Domani' : fmtShort(t.scadenza!);
  return <span className={`pill due-${due.kind}`}>{label}</span>;
}

export function TaskCard({ t, showProject = true }: { t: Task; showProject?: boolean }) {
  const { today, open, data } = useStore();
  const st = taskStatus(t, today);
  const proj = data?.progetti.find((p) => p.codice === t.progettoCodice);
  return (
    <button className={`task-card st-${st}`} onClick={() => open({ kind: 'task', id: t.id })}>
      <span className="tc-top">
        <span className="tc-proj">{showProject ? `${t.progettoCodice || '—'}${proj ? ` · ${proj.nome}` : ''}` : t.tipologia}</span>
        <DuePill t={t} today={today} />
      </span>
      <span className="tc-title">{t.titolo || t.descrizione}</span>
      <span className={`tc-status s-${st}`}><StatusIcon s={st} /> {STATUS_LABEL[st]}</span>
    </button>
  );
}
