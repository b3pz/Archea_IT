import { StoreProvider, useStore, type Tab } from './ui/store';
import { Today } from './ui/Today';
import { Projects } from './ui/Projects';
import { Notes } from './ui/Notes';
import { Hours } from './ui/Hours';
import { NoteDetail, ProjectDetail, TaskDetail } from './ui/Details';
import { Profile, SOURCE_BADGE } from './ui/Profile';
import { Avatar } from './ui/common';
import { Calendar, Clock, Folder, NoteIcon } from './ui/icons';

const TABS: [Tab, string, () => JSX.Element][] = [['oggi', 'Oggi', Calendar], ['progetti', 'Progetti', Folder], ['note', 'Note', () => <NoteIcon />], ['ore', 'Ore', Clock]];

function Shell() {
  const { data, viewer, tab, setTab, overlay, open, loading, error, reload } = useStore();
  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="wordmark">ARCHEA</span>{data && <span className={`src src-${data.meta.source}`}>{SOURCE_BADGE[data.meta.source]}</span>}</div>
        {viewer && <Avatar name={viewer.nome} size={44} onClick={() => open({ kind: 'profile' })} label="Persona e origine dei dati" />}
      </header>
      <main className="main">
        {error && <div className="banner error" role="alert">Impossibile caricare i dati: {error} <button className="link" onClick={() => void reload()}>Riprova</button></div>}
        {loading && !data && <p className="empty">Caricamento…</p>}
        {data && viewer && (tab === 'oggi' ? <Today key={viewer.id} /> : tab === 'progetti' ? <Projects /> : tab === 'note' ? <Notes /> : <Hours key={viewer.id} />)}
        {data && <p className="foot">{data.meta.source === 'demo' ? 'Dati dimostrativi' : data.meta.label} · aggiornati alle {new Date(data.meta.loadedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })}{loading ? ' · aggiornamento…' : ''}</p>}
      </main>
      <nav className="tabbar" aria-label="Sezioni">
        {TABS.map(([k, l, Icon]) => <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}><Icon /><span>{l}</span></button>)}
      </nav>
      {overlay?.kind === 'task' && <TaskDetail id={overlay.id!} />}
      {overlay?.kind === 'project' && <ProjectDetail code={overlay.id!} />}
      {overlay?.kind === 'note' && <NoteDetail id={overlay.id!} />}
      {overlay?.kind === 'profile' && <Profile />}
    </div>
  );
}
export default function App() { return <StoreProvider><Shell /></StoreProvider>; }
