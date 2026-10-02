import type { Task } from './types';
import { addDays, diffDays } from './dates';

/**
 * Stati come nella formula del foglio (priorità):
 * 1 validata (validated && completed && dataChiusura) · 2 da rivedere (commenti) ·
 * 3 scaduta (scadenza < oggi) · 4 in scadenza (oggi o domani) · 5 in lavorazione.
 * ATTENZIONE: ricavata dalle istruzioni, non dalla formula viva del foglio (da verificare).
 */
export type TaskStatus = 'validata' | 'da_rivedere' | 'scaduta' | 'in_scadenza' | 'in_lavorazione';
export const STATUS_LABEL: Record<TaskStatus, string> = {
  validata: 'Validata', da_rivedere: 'Da rivedere', scaduta: 'Scaduta', in_scadenza: 'In scadenza', in_lavorazione: 'In corso',
};
export const STATUS_ICON: Record<TaskStatus, string> = {
  validata: '👍', da_rivedere: '⚠️', scaduta: '☠️', in_scadenza: '⏰', in_lavorazione: '⚙️',
};

export const isReal = (t: Pick<Task, 'titolo' | 'descrizione'>) => !!(t.titolo.trim() || t.descrizione.trim());

export function taskStatus(t: Task, today: string): TaskStatus {
  if (t.validated && t.completed && t.dataChiusura) return 'validata';
  if (t.commenti.trim()) return 'da_rivedere';
  if (t.scadenza && t.scadenza < today) return 'scaduta';
  if (t.scadenza && t.scadenza <= addDays(today, 1)) return 'in_scadenza';
  return 'in_lavorazione';
}
export const isOpen = (t: Task, today: string) => taskStatus(t, today) !== 'validata';

/** Indicatore temporale, distinto dallo stato: domani arancione, oggi rosso, oltre scadenza ben visibile. */
export type DueKind = 'none' | 'future' | 'tomorrow' | 'today' | 'overdue';
export function dueIndicator(t: Task, today: string): { kind: DueKind; days: number } {
  if (!t.scadenza) return { kind: 'none', days: 0 };
  const d = diffDays(t.scadenza, today);
  return { kind: d < 0 ? 'overdue' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'future', days: d };
}

const STATUS_RANK: Record<TaskStatus, number> = { scaduta: 0, da_rivedere: 1, in_scadenza: 2, in_lavorazione: 3, validata: 4 };
/** Urgenti per prime: scadute, da rivedere, in scadenza; poi per scadenza crescente; senza data in fondo. */
export function byUrgency(today: string) {
  return (a: Task, b: Task) =>
    STATUS_RANK[taskStatus(a, today)] - STATUS_RANK[taskStatus(b, today)] ||
    (a.scadenza ?? '9999').localeCompare(b.scadenza ?? '9999');
}
