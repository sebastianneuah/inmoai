// Pantalla inicial y pantallas secundarias del menú principal.
import React, { useRef, useState } from 'react';
import { useStore } from '../store';
import { repo, exportSave, importSave, type SaveMeta } from '../../engine/save';
import { Icon, Modal, Toggle, Card, Empty } from '../components';
import { eventCount } from '../../engine/game';
import type { Settings } from '../../engine/types';

const PREFS = 'elpresidente:prefs';
export function loadPrefs(): Settings {
  const d: Settings = { difficulty: 'normal', mode: 'normal', liveMatches: true, liveSpeed: 1, delegate: { mercado: false, finanzasMenores: false, prensa: false } };
  try {
    return { ...d, ...(JSON.parse(localStorage.getItem(PREFS) ?? '{}') as Partial<Settings>) };
  } catch {
    return d;
  }
}
export function savePrefs(p: Settings) {
  try {
    localStorage.setItem(PREFS, JSON.stringify(p));
  } catch {
    /* sin almacenamiento */
  }
}

function Back({ title, sub }: { title: string; sub?: string }) {
  const { setScreen } = useStore();
  return (
    <div className="page-h">
      <div className="row">
        <button className="icon-btn" onClick={() => setScreen('menu')} aria-label="Volver">
          <Icon name="left" />
        </button>
        <div>
          <h1>{title}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function MainMenu() {
  const { setScreen, load, toast } = useStore();
  const last = repo.lastPlayed();
  const lastMeta = repo.list().find((m) => m.id === last);
  const cont = () => {
    if (!last) return;
    const g = repo.load(last);
    if (!g) return toast('No se pudo cargar la partida.', 'err');
    load(g);
  };
  return (
    <div className="hero">
      <div className="hero-box">
        <div className="center" style={{ color: 'var(--gold)', marginBottom: 14 }}>
          <svg width="54" height="54" viewBox="0 0 64 64" aria-hidden>
            <path d="M32 3 58 11v21c0 15-11 24-26 29C17 56 6 47 6 32V11z" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M20 40V24l6 8 6-10 6 10 6-8v16z" fill="currentColor" />
          </svg>
        </div>
        <div className="hero-title">EL PRESIDENTE</div>
        <div className="hero-sub">El fútbol también se juega en los despachos.</div>
        <div className="menu-list">
          <button className="btn gold" onClick={() => setScreen('new')}>
            <span>Nueva carrera</span>
            <Icon name="right" />
          </button>
          <button className="btn" disabled={!last} onClick={cont}>
            <span className="col" style={{ gap: 0, alignItems: 'flex-start' }}>
              <span>Continuar partida</span>
              {lastMeta && <span className="tiny muted">{lastMeta.president} · {lastMeta.club ?? lastMeta.position} · {lastMeta.season}, sem. {lastMeta.week}</span>}
            </span>
            <Icon name="play" />
          </button>
          <button className="btn" onClick={() => setScreen('saves')}>
            <span>Partidas guardadas</span>
            <Icon name="save" />
          </button>
          <button className="btn" onClick={() => setScreen('how')}>
            <span>Cómo jugar</span>
            <Icon name="ball" />
          </button>
          <button className="btn" onClick={() => setScreen('settings')}>
            <span>Configuración</span>
            <Icon name="menu" />
          </button>
          <button className="btn" onClick={() => setScreen('history')}>
            <span>Historial de carreras</span>
            <Icon name="star" />
          </button>
        </div>
        <div className="divider" />
        <p className="center tiny dim upper">Simulador de poder futbolístico · universo ficticio · {eventCount()} acontecimientos base</p>
      </div>
    </div>
  );
}

export function SavedGames() {
  const { load, toast } = useStore();
  const [list, setList] = useState<SaveMeta[]>(repo.list());
  const [confirm, setConfirm] = useState<SaveMeta | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const doImport = (text: string) => {
    const g = importSave(text);
    if (!g) return toast('El archivo no es una partida válida de EL PRESIDENTE.', 'err');
    try {
      repo.save(g);
    } catch {
      return toast('No hay espacio de almacenamiento suficiente.', 'err');
    }
    setList(repo.list());
    setImportOpen(false);
    setImportText('');
    toast('Partida importada.', 'ok');
  };
  const download = (m: SaveMeta) => {
    const g = repo.load(m.id);
    if (!g) return;
    const text = exportSave(g);
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `el-presidente-${m.president.replace(/\s+/g, '-').toLowerCase()}-${m.season}.elp`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      /* fallback abajo */
    }
    setExportText(text);
  };
  return (
    <div className="content" style={{ maxWidth: 860 }}>
      <Back title="Partidas guardadas" sub="Guardado automático después de cada decisión y cada partido." />
      <div className="row wrap mb">
        <button className="btn" onClick={() => setImportOpen(true)}>
          <Icon name="save" size={18} /> Importar partida
        </button>
      </div>
      <Card>
        {list.length === 0 && <Empty>No hay partidas guardadas todavía.</Empty>}
        {list.map((m) => (
          <div key={m.id} className="list-row">
            <div className="grow">
              <div style={{ fontWeight: 700 }}>{m.president}</div>
              <div className="small muted ellipsis">
                {m.club ?? m.position} · Temporada {m.season}, semana {m.week} · {new Date(m.updatedAt).toLocaleString('es-AR')}
              </div>
            </div>
            <button className="btn sm gold" onClick={() => { const g = repo.load(m.id); if (g) load(g); else toast('Partida dañada.', 'err'); }}>
              Jugar
            </button>
            <button className="btn sm" onClick={() => download(m)}>Exportar</button>
            <button className="btn sm danger" onClick={() => setConfirm(m)} aria-label="Eliminar">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </Card>
      {confirm && (
        <Modal title="Eliminar partida" onClose={() => setConfirm(null)} footer={<><button className="btn" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn danger" onClick={() => { repo.remove(confirm.id); setList(repo.list()); setConfirm(null); toast('Partida eliminada.', 'ok'); }}>Eliminar definitivamente</button></>}>
          <p>¿Seguro que querés eliminar la partida de <b>{confirm.president}</b> ({confirm.club ?? confirm.position}, {confirm.season})? Esta acción no se puede deshacer.</p>
        </Modal>
      )}
      {exportText && (
        <Modal title="Exportar partida" sub="Se descargó un archivo .elp. También podés copiar este código para importarlo en otro dispositivo." onClose={() => setExportText(null)}>
          <textarea className="input" readOnly value={exportText} rows={6} onFocus={(e) => e.currentTarget.select()} style={{ fontFamily: 'monospace', fontSize: 11 }} />
          <button className="btn block mt" onClick={() => { navigator.clipboard?.writeText(exportText).then(() => toast('Código copiado.', 'ok')).catch(() => toast('Copialo manualmente.', 'err')); }}>Copiar código</button>
        </Modal>
      )}
      {importOpen && (
        <Modal title="Importar partida" onClose={() => setImportOpen(false)} footer={<button className="btn gold" disabled={!importText.trim()} onClick={() => doImport(importText)}>Importar</button>}>
          <input ref={fileRef} type="file" accept=".elp,.txt,.json" className="input" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(doImport); }} />
          <div className="muted small mt">o pegá el código exportado:</div>
          <textarea className="input mt-s" rows={6} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="ELPRESIDENTE1:..." />
        </Modal>
      )}
    </div>
  );
}

export function CareerHistory() {
  const h = repo.history();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="content" style={{ maxWidth: 860 }}>
      <Back title="Historial de carreras" sub="Las carreras finalizadas quedan registradas con su legado." />
      <Card>
        {h.length === 0 && <Empty>Todavía no terminaste ninguna carrera. Cuando te retires, tu biografía aparecerá acá.</Empty>}
        {h.map((e) => (
          <div key={e.id} className="list-row" style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
            <div className="row between" style={{ width: '100%' }}>
              <div>
                <div style={{ fontWeight: 800 }}>{e.president}</div>
                <div className="small muted">{e.seasons} · {e.peak} · {e.titles} títulos · {e.reason}</div>
              </div>
              <div className="right">
                <div className="gold" style={{ fontWeight: 900, fontSize: 22 }}>{e.legacy}</div>
                <div className="tiny muted upper">Legado</div>
              </div>
            </div>
            <button className="btn sm ghost" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? 'Ocultar biografía' : 'Ver biografía'}</button>
            {open === e.id && <p className="small" style={{ lineHeight: 1.6 }}>{e.bio}</p>}
          </div>
        ))}
      </Card>
    </div>
  );
}

export function HowToPlay() {
  const items: [string, string][] = [
    ['Sos el presidente, no el entrenador', 'No elegís tácticas ni formaciones. Tus herramientas son el dinero, las relaciones, las decisiones y el poder. El equipo rinde según el plantel, el entrenador, la moral, la estabilidad institucional y la suerte.'],
    ['Avanzá rápido', 'AVANZAR SEMANA juega la fecha y procesa la economía. SIMULAR PRÓXIMO PARTIDO avanza hasta que tu club juega. También podés simular un mes o avanzar hasta el próximo acontecimiento importante: la simulación se detiene ante decisiones urgentes.'],
    ['Decidí', 'Los acontecimientos llegan a tu bandeja con prioridad urgente, importante o informativa. Las urgentes bloquean el avance. Ninguna opción es siempre correcta: algunas consecuencias se ven en el momento y otras aparecen semanas o temporadas después.'],
    ['Cuidá los 20 indicadores', 'Socios, hinchas, barra, patrocinadores, plantel, comisión directiva, asociación, prensa, integridad, riesgo de investigación… Todos afectan la simulación: el rendimiento, los ingresos, las elecciones, las sanciones y los intentos de destitución.'],
    ['Administrá el dinero', 'Las cuentas del club y tu patrimonio personal están separados. Si la caja se hunde llegan los atrasos salariales, las inhibiciones, las huelgas y hasta la intervención judicial.'],
    ['La política es el juego grande', 'Ganá elecciones en tu club, sumate al Comité Ejecutivo de la AAF, construí alianzas con otros presidentes y postulate a la asociación, la confederación sudamericana y la Federación Internacional. Nadie asciende por puntos: hay que ganar votos.'],
    ['Los personajes recuerdan', 'Cada dirigente, entrenador, representante y periodista guarda memoria de lo que hiciste. Un entrenador al que respaldaste puede apoyarte años después; un representante maltratado puede negarse a negociar.'],
    ['Perder no es el final', 'Si perdés una elección quedás sin cargo, pero podés postularte en otro club, aceptar un rol de normalizador o volver más adelante. La carrera termina cuando decidís retirarte.'],
    ['Delegá', 'En Configuración podés delegar acontecimientos menores del mercado, las finanzas y la prensa. En modo rápido sólo aparecen las decisiones importantes.'],
  ];
  return (
    <div className="content" style={{ maxWidth: 860 }}>
      <Back title="Cómo jugar" sub="Una temporada se juega en 10 a 20 minutos en modo rápido." />
      <div className="grid g2 stack">
        {items.map(([t, d]) => (
          <Card key={t}>
            <h3 className="gold" style={{ fontSize: 15, marginBottom: 6 }}>{t}</h3>
            <p className="small muted" style={{ lineHeight: 1.6 }}>{d}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  return (
    <div className="col">
      <label className="field">
        Modo de juego
        <div className="pill-tabs">
          {([['rapido', 'Rápido', 'Sólo decisiones importantes y partidos instantáneos'], ['normal', 'Normal', 'Decisiones frecuentes y gestión intermedia'], ['detallado', 'Detallado', 'Gestión institucional profunda']] as const).map(([id, n, d]) => (
            <button key={id} className={`opt-card ${settings.mode === id ? 'on' : ''}`} style={{ flex: '1 1 160px' }} onClick={() => set({ mode: id, liveMatches: id === 'rapido' ? false : settings.liveMatches })}>
              <b>{n}</b>
              <span className="small muted">{d}</span>
            </button>
          ))}
        </div>
      </label>
      <Toggle on={settings.liveMatches} onChange={(v) => set({ liveMatches: v })} label="Partidos en vivo" desc="Narración textual acelerada de los partidos de tu equipo. Desactivado: resultado instantáneo." />
      <label className="field mt-s">
        Velocidad de la narración: x{settings.liveSpeed}
        <input type="range" min={1} max={4} step={1} value={settings.liveSpeed} onChange={(e) => set({ liveSpeed: Number(e.target.value) })} />
      </label>
      <div className="tiny muted upper mt">Delegación</div>
      <Toggle on={settings.delegate.mercado} onChange={(v) => set({ delegate: { ...settings.delegate, mercado: v } })} label="Director deportivo: mercado de pases" desc="Resuelve acontecimientos menores del mercado y ficha dentro del presupuesto durante los libros de pases." />
      <Toggle on={settings.delegate.finanzasMenores} onChange={(v) => set({ delegate: { ...settings.delegate, finanzasMenores: v } })} label="Tesorero: finanzas menores" desc="Resuelve cuestiones financieras de baja gravedad." />
      <Toggle on={settings.delegate.prensa} onChange={(v) => set({ delegate: { ...settings.delegate, prensa: v } })} label="Vicepresidente: prensa menor" desc="Atiende entrevistas y temas de prensa de baja gravedad." />
    </div>
  );
}

export function SettingsScreen() {
  const [p, setP] = useState(loadPrefs());
  const { toast } = useStore();
  return (
    <div className="content" style={{ maxWidth: 760 }}>
      <Back title="Configuración" sub="Valores por defecto para nuevas carreras. Dentro de una partida podés cambiarlos desde el menú." />
      <Card>
        <SettingsPanel settings={p} onChange={(n) => { setP(n); savePrefs(n); }} />
      </Card>
      <Card className="mt">
        <div className="row between">
          <div>
            <b>Datos locales</b>
            <div className="small muted">Las partidas se guardan en este navegador. Exportalas para no perderlas al borrar datos.</div>
          </div>
          <button className="btn sm" onClick={() => toast(`${repo.list().length} partidas guardadas en este dispositivo.`)}>Ver estado</button>
        </div>
      </Card>
    </div>
  );
}
