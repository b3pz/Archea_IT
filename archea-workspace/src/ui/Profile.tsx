import { useRef, useState } from 'react';
import { useStore } from './store';
import { Avatar, Sheet } from './common';
import { Refresh, Upload } from './icons';
import { PENDING_DECISIONS } from '../config/permissions';
import { MAIN_PEOPLE } from '../config/sheets';

export const SOURCE_BADGE = { demo: 'DEMO', excel: 'EXCEL STATICO', live: 'LIVE' } as const;

export function Profile() {
  const { data, viewer, setViewerId, close, reload, importExcel, backToDemo, loading, error } = useStore();
  const file = useRef<HTMLInputElement>(null); const [warn, setWarn] = useState(false);
  if (!data || !viewer) return null;
  const m = data.meta;
  const desc = { demo: 'Dati dimostrativi fittizi, generati nel layout dei fogli reali. Nessun dato del team.', excel: 'Importazione statica da file locale. Elaborata solo in questa pagina, non salvata né inviata, e non aggiornata dal Google Fogli.', live: 'Connessione a Google Fogli.' }[m.source];
  return (
    <Sheet title="Persona e dati" onClose={close}>
      <h4>Persona · simulazione</h4>
      <p className="hint first">Selezione di prova per vedere le schermate come un altro membro. <b>Non è un accesso</b>: con i dati live servirà l'autenticazione Google.</p>
      <div className="radio-list">
        {MAIN_PEOPLE.map((p) => (
          <button key={p.id} className={`pick-row${viewer.id === p.id ? ' on' : ''}`} onClick={() => setViewerId(p.id)} aria-pressed={viewer.id === p.id}>
            <Avatar name={p.nome} size={36} /><b>{p.nome}</b><small>{p.ruolo === 'responsabile' ? 'Responsabile' : 'Membro'}</small>
          </button>
        ))}
      </div>
      <h4>Origine dei dati</h4>
      <div className="callout"><b>{SOURCE_BADGE[m.source]} · {m.label}</b><p>{desc}</p>
        <p>Caricati: {new Date(m.loadedAt).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}. Connessione Google Fogli live: <b>non attiva</b>.</p></div>
      <div className="stat-line">{Object.entries(m.stats).map(([k, v]) => <span key={k}>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}: <b>{v}</b></span>)}</div>
      {error && <p className="error">Errore: {error}</p>}
      <div className="btn-row">
        <button className="btn" disabled={loading} onClick={() => void reload()}><Refresh /> Aggiorna</button>
        <button className="btn" disabled={loading} onClick={() => file.current?.click()}><Upload /> Importa Excel (locale)</button>
        {m.source !== 'demo' && <button className="btn" onClick={() => void backToDemo()}>Rimuovi dati e torna alla demo</button>}
        <input ref={file} type="file" hidden accept=".xlsx,.xlsm" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importExcel(f).then(close); e.target.value = ''; }} />
      </div>
      {m.warnings.length > 0 && (
        <><button className="link warn-toggle" onClick={() => setWarn(!warn)}>{warn ? 'Nascondi' : 'Mostra'} segnalazioni sui dati ({m.warnings.length})</button>
          {warn && <ul className="warns">{m.warnings.slice(0, 80).map((w, i) => <li key={i}>{w}</li>)}</ul>}</>
      )}
      <h4>Decisioni in sospeso sugli accessi</h4>
      <ul className="warns">{PENDING_DECISIONS.map((d) => <li key={d}>{d}</li>)}</ul>
    </Sheet>
  );
}
