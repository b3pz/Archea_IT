import { useEffect, type ReactNode } from 'react';
import { Close } from './icons';
import { initials } from '../domain/people';
import type { NoteStatus } from '../domain/types';

export const Avatar = ({ name, size = 40, active = false, onClick, label }: { name: string; size?: number; active?: boolean; onClick?: () => void; label?: string }) => {
  const style = { width: size, height: size, fontSize: size * 0.34 };
  const cls = `avatar${active ? ' active' : ''}`;
  return onClick
    ? <button className={cls} style={style} onClick={onClick} aria-pressed={active} aria-label={label ?? name} title={name}>{initials(name)}</button>
    : <span className={cls} style={style} aria-hidden="true">{initials(name)}</span>;
};

/** Pannello a scorrimento dal basso (a tutta altezza su mobile). Chiude con Esc, ✕ o tocco sullo sfondo. */
export function Sheet({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Chiudi"><Close /></button></div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export const Segmented = <T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange(v: T): void; label: string }) => (
  <div className="segmented" role="tablist" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
    {options.map(([v, l]) => <button key={v} role="tab" aria-selected={v === value} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
  </div>
);

export const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange(v: string): void; placeholder: string }) => (
  <label className="searchbox"><span className="sr-only">{placeholder}</span><span className="si"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="6.500" /><path d="m20 20-4-4" /></svg></span>
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} enterKeyHint="search" /></label>
);

export const NOTE_LABEL: Record<NoteStatus, string> = { aperta: 'Aperta', in_corso: 'In corso', chiusa: 'Chiusa' };
export const NoteBadge = ({ s }: { s: NoteStatus }) => <span className={`pill note-${s}`}>{NOTE_LABEL[s]}</span>;

export const projectStatusClass = (s: string) => `ps-${s.toLowerCase().replace(/[^a-z]/g, '') || 'nd'}`;
export const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;
