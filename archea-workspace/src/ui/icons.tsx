import type { ReactNode } from 'react';
import type { TaskStatus } from '../domain/taskRules';

const I = ({ children, size = 22 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const Calendar = () => <I><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></I>;
export const Folder = () => <I><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /></I>;
export const NoteIcon = ({ size }: { size?: number }) => <I size={size}><path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" /><path d="M14 3.5V8h4M8.5 12.5h7M8.5 16h5" /></I>;
export const Clock = () => <I><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></I>;
export const Search = () => <I size={20}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></I>;
export const ChevL = () => <I size={20}><path d="m14.5 6-6 6 6 6" /></I>;
export const ChevR = () => <I size={20}><path d="m9.5 6 6 6-6 6" /></I>;
export const ChevD = () => <I size={18}><path d="m6 9.5 6 6 6-6" /></I>;
export const Close = () => <I size={20}><path d="M6 6l12 12M18 6 6 18" /></I>;
export const ListIcon = () => <I size={18}><path d="M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01" /></I>;
export const Refresh = () => <I size={18}><path d="M19.5 12a7.5 7.5 0 0 1-13 5.1M4.5 12A7.5 7.5 0 0 1 17.5 6.9M17.5 3.5v3.4h-3.4M6.5 20.5v-3.4h3.4" /></I>;
export const Paperclip = () => <I size={16}><path d="m20 11.5-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.700 4.700L9.700 17.200a1.700 1.700 0 0 1-2.400-2.400L14.500 7.500" /></I>;
export const Copy = () => <I size={16}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></I>;
export const External = () => <I size={16}><path d="M14 5h5v5M19 5l-8 8M18 14v4a1.500 1.500 0 0 1-1.500 1.500h-10A1.500 1.500 0 0 1 5 18V8a1.500 1.500 0 0 1 1.500-1.500H10" /></I>;
export const Building = () => <I size={34}><path d="M4 20h16M6 20V9l6-4 6 4v11M9.500 20v-5h5v5M9.500 11.500h.01M14.500 11.500h.01" /></I>;
export const Upload = () => <I size={18}><path d="M12 16V5M7.500 9.500 12 5l4.500 4.500M5 19h14" /></I>;

/** Icone di stato lineari (sostituiscono le emoji della sorgente nell'interfaccia). */
export function StatusIcon({ s }: { s: TaskStatus }) {
  const c = <circle cx="12" cy="12" r="8.500" />;
  const body: Record<TaskStatus, ReactNode> = {
    in_lavorazione: <><path d="M12 3.500a8.500 8.500 0 1 0 8.500 8.500" />{<path d="M12 8v4l2.500 1.500" />}</>,
    da_rivedere: <>{c}<path d="M12 7.500v5M12 16h.01" /></>,
    scaduta: <>{c}<path d="m9 9 6 6M15 9l-6 6" /></>,
    in_scadenza: <>{c}<path d="M12 7.500V12l3 2" /></>,
    validata: <>{c}<path d="m8.500 12.200 2.500 2.500 4.500-5" /></>,
  };
  return <I size={16}>{body[s]}</I>;
}
