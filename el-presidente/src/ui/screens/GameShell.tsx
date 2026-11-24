// Estructura del juego: barra lateral (escritorio), barra superior y barra inferior (celulares).
import React from 'react';
import { useGame, type Tab } from '../store';
import { Crest, Icon, Money } from '../components';
import { userClub } from '../../engine/queries';
import { gameDate } from '../../engine/util';
import { institutionCash } from '../../engine/economy';
import { ModalHost } from './Modals';
import { Dashboard } from './Dashboard';
import { Decisions } from './Decisions';
import { Competition } from './Competition';
import { Squad } from './Squad';
import { Finance } from './Finance';
import { Politics } from './Politics';
import { Institution } from './Institution';
import { Career } from './Career';
import { News } from './News';
import { NationalTeam } from './NationalTeam';
import type { CrestDef } from '../../engine/types';

export const AAF_CREST: CrestDef = { shape: 'circulo', pattern: 'franja', c1: '#74acdf', c2: '#ffffff' };
export const CSF_CREST: CrestDef = { shape: 'escudo', pattern: 'liso', c1: '#0b2d6b', c2: '#d4af37' };
export const FIF_CREST: CrestDef = { shape: 'circulo', pattern: 'liso', c1: '#1d4ed8', c2: '#ffffff' };

export function useNav() {
  const { s } = useGame();
  const pos = s.president.pos;
  const items: { id: Tab; label: string; icon: string; show: boolean }[] = [
    { id: 'inicio', label: 'Inicio', icon: 'home', show: true },
    { id: 'decisiones', label: 'Decisiones', icon: 'inbox', show: true },
    { id: 'competicion', label: 'Competición', icon: 'trophy', show: true },
    { id: 'plantel', label: 'Plantel', icon: 'shirt', show: pos === 'club' },
    { id: 'seleccion', label: 'Selección', icon: 'flag', show: pos === 'asociacion' },
    { id: 'finanzas', label: 'Finanzas', icon: 'money', show: pos !== 'sin_cargo' && pos !== 'retirado' },
    { id: 'politica', label: 'Política', icon: 'landmark', show: true },
    { id: 'institucion', label: 'Institución', icon: 'building', show: true },
    { id: 'carrera', label: 'Carrera', icon: 'star', show: true },
    { id: 'noticias', label: 'Noticias', icon: 'news', show: true },
  ];
  return items.filter((i) => i.show);
}

export function headerIdentity(s: ReturnType<typeof useGame>['s']) {
  const c = userClub(s);
  if (s.president.pos === 'club' && c) return { name: c.name, crest: c.crest, short: c.short, club: c };
  if (s.president.pos === 'asociacion') return { name: 'Asociación Argentina de Fútbol', crest: AAF_CREST, short: 'AAF', club: null };
  if (s.president.pos === 'confederacion') return { name: s.confed.name, crest: CSF_CREST, short: 'CSF', club: null };
  if (s.president.pos === 'fifa') return { name: s.fifa.name, crest: FIF_CREST, short: 'FIF', club: null };
  return { name: s.president.pos === 'retirado' ? 'Retirado' : 'Sin cargo', crest: { shape: 'escudo', pattern: 'liso', c1: '#1b2333', c2: '#d4af37' } as CrestDef, short: '—', club: null };
}

export function GameShell() {
  const { s, tab, setTab, push } = useGame();
  const nav = useNav();
  const id = headerIdentity(s);
  const pending = s.inbox.length;
  const urgent = s.inbox.some((e) => e.urgency === 'urgente');
  const current = nav.some((n) => n.id === tab) ? tab : 'inicio';
  const mobileMain: Tab[] = ['inicio', 'decisiones', 'competicion', s.president.pos === 'club' ? 'plantel' : s.president.pos === 'asociacion' ? 'seleccion' : 'politica'];

  const screen = (() => {
    switch (current) {
      case 'inicio': return <Dashboard />;
      case 'decisiones': return <Decisions />;
      case 'competicion': return <Competition />;
      case 'plantel': return <Squad />;
      case 'seleccion': return <NationalTeam />;
      case 'finanzas': return <Finance />;
      case 'politica': return <Politics />;
      case 'institucion': return <Institution />;
      case 'carrera': return <Career />;
      case 'noticias': return <News />;
    }
  })();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden style={{ color: 'var(--gold)' }}>
            <path d="M32 3 58 11v21c0 15-11 24-26 29C17 56 6 47 6 32V11z" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M20 40V24l6 8 6-10 6 10 6-8v16z" fill="currentColor" />
          </svg>
          <div className="logo">EL PRESIDENTE<small>FOOTBALL POWER SIMULATOR</small></div>
        </div>
        {nav.map((n) => (
          <button key={n.id} className={`nav-item ${current === n.id ? 'on' : ''}`} onClick={() => setTab(n.id)}>
            <Icon name={n.icon} size={19} />
            {n.label}
            {n.id === 'decisiones' && pending > 0 && <span className="badge" style={{ background: urgent ? 'var(--red)' : 'var(--amber)' }}>{pending}</span>}
          </button>
        ))}
        <div className="grow" />
        <button className="nav-item" onClick={() => push({ type: 'gamemenu' })}>
          <Icon name="menu" size={19} /> Menú
        </button>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="club">
            <Crest crest={id.crest} short={id.short} size={34} />
            <div className="ellipsis">
              <div className="nm ellipsis">{id.name}</div>
              <div className="tiny muted ellipsis">{s.president.name} {s.president.surname}</div>
            </div>
          </div>
          <div className="meta">
            <div className="m hide-m"><b>{gameDate(s.season, s.week)}</b><span>Semana {s.week} · {s.season}</span></div>
            {s.president.pos !== 'sin_cargo' && s.president.pos !== 'retirado' && (
              <div className="m"><b><Money v={institutionCash(s)} className={institutionCash(s) < 0 ? 'neg' : ''} /></b><span>Caja</span></div>
            )}
            <button className="icon-btn" onClick={() => push({ type: 'gamemenu' })} aria-label="Menú">
              <Icon name="menu" size={19} />
            </button>
          </div>
        </header>
        <main className="content">{screen}</main>
      </div>
      <nav className="bottom-nav">
        {mobileMain.map((t) => {
          const n = nav.find((x) => x.id === t) ?? nav[0];
          return (
            <button key={t} className={current === t ? 'on' : ''} onClick={() => setTab(t)}>
              <Icon name={n.icon} size={21} />
              {n.label}
              {t === 'decisiones' && pending > 0 && <span className="badge" style={{ background: urgent ? 'var(--red)' : 'var(--amber)' }}>{pending}</span>}
            </button>
          );
        })}
        <button className={!mobileMain.includes(current) ? 'on' : ''} onClick={() => push({ type: 'more' })}>
          <Icon name="more" size={21} stroke={3} />
          Más
        </button>
      </nav>
      <ModalHost />
    </div>
  );
}
