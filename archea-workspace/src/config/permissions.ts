import type { Persona, Task, Nota, Progetto } from '../domain/types';

/** Politica di accesso centrale. I punti PENDING richiedono conferma prima dell'accesso live. */
export const POLICY = {
  /** La colonna "Shared" del Task Manager è ambigua: NON governa l'autorizzazione. */
  sharedColumnGrantsAccess: false,
  /** PENDING: i membri vedono tutti i progetti? (nel prototipo sì) */
  membersSeeAllProjects: true,
  /** PENDING: i membri vedono tutte le note dei progetti? (nel prototipo sì) */
  membersSeeAllNotes: true,
  /** Ore individuali degli altri membri: non esposte. */
  membersSeeOthersHours: false,
  /** Task di altri membri: non esposte ai membri (solo le proprie). */
  membersSeeOthersTasks: false,
};
export const PENDING_DECISIONS = [
  'Visibilità di progetti e note per i membri (ora: tutti, solo in demo).',
  'Se la colonna "Shared" debba avere un ruolo di autorizzazione (ora: nessuno).',
  'Se i membri possano vedere le task assegnate ad altri (ora: no).',
];

export const isManager = (p: Persona) => p.ruolo === 'responsabile';

export function canViewHours(viewer: Persona, target: Persona): boolean {
  return isManager(viewer) || viewer.id === target.id || POLICY.membersSeeOthersHours;
}
export function visibleTasks(viewer: Persona, tasks: Task[], isMine: (t: Task, p: Persona) => boolean): Task[] {
  return isManager(viewer) || POLICY.membersSeeOthersTasks ? tasks : tasks.filter((t) => isMine(t, viewer));
}
export const visibleProjects = (v: Persona, p: Progetto[]) => (isManager(v) || POLICY.membersSeeAllProjects ? p : []);
export const visibleNotes = (v: Persona, n: Nota[]) => (isManager(v) || POLICY.membersSeeAllNotes ? n : []);
