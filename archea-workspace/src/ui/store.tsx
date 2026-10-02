import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Dataset, Persona } from '../domain/types';
import { demoSource, loadExcelFile } from '../data/adapters';
import { todayRome } from '../domain/dates';

export type Tab = 'oggi' | 'progetti' | 'note' | 'ore';
export type Overlay = { kind: 'task' | 'project' | 'note' | 'profile'; id?: string } | null;

interface Store {
  data: Dataset | null; loading: boolean; error: string | null;
  viewer: Persona | null; setViewerId(id: string): void;
  today: string;
  tab: Tab; setTab(t: Tab): void;
  overlay: Overlay; open(o: Overlay): void; close(): void;
  reload(): Promise<void>; importExcel(f: File): Promise<void>; backToDemo(): Promise<void>;
  noteProject: string | null; setNoteProject(c: string | null): void;
}
const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState('fdiamanti');
  const [today, setToday] = useState(todayRome());
  const [tab, setTabState] = useState<Tab>((location.hash.slice(2) as Tab) || 'oggi');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [noteProject, setNoteProject] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<Dataset>) => {
    setLoading(true); setError(null);
    try { setData(await fn()); setToday(todayRome()); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void run(() => demoSource.load()); }, [run]);
  useEffect(() => { // il giorno cambia a mezzanotte (Europe/Rome): ricalcola quando l'app torna visibile
    const f = () => document.visibilityState === 'visible' && setToday(todayRome());
    document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f);
  }, []);
  useEffect(() => { const f = () => setOverlay(null); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);

  const viewer = useMemo(() => data?.persone.find((p) => p.id === viewerId) ?? data?.persone[0] ?? null, [data, viewerId]);
  const value: Store = {
    data, loading, error, viewer, setViewerId, today, tab, overlay, noteProject, setNoteProject,
    setTab: (t) => { setTabState(t); setOverlay(null); history.replaceState(null, '', `#/${t}`); window.scrollTo(0, 0); },
    open: setOverlay, close: () => setOverlay(null),
    reload: () => run(() => (data?.meta.source === 'demo' || !data ? demoSource.load() : Promise.resolve(data))),
    importExcel: (f) => run(() => loadExcelFile(f)),
    backToDemo: () => run(() => demoSource.load()),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
