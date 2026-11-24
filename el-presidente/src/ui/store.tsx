// Estado central de la interfaz. El GameState vive en una referencia mutable;
// cada acción del motor incrementa la versión (re-render) y guarda automáticamente.
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { GameState, SeasonSummary } from '../engine/types';
import { repo } from '../engine/save';
import type { ResolveResult } from '../engine/events';

export type Screen = 'menu' | 'new' | 'how' | 'settings' | 'saves' | 'history' | 'game';
export type Tab = 'inicio' | 'decisiones' | 'competicion' | 'plantel' | 'seleccion' | 'finanzas' | 'politica' | 'institucion' | 'carrera' | 'noticias';

export type ModalState =
  | { type: 'decision'; uid: string }
  | { type: 'outcome'; res: ResolveResult; nextUid?: string | null }
  | { type: 'match'; fixtureId: string; live: boolean }
  | { type: 'season'; summary: SeasonSummary }
  | { type: 'player'; id: string }
  | { type: 'buy'; id: string }
  | { type: 'coach'; id: string }
  | { type: 'confirm'; title: string; body: string; ok: string; danger?: boolean; onOk: () => void }
  | { type: 'info'; title: string; body: React.ReactNode }
  | { type: 'gamemenu' }
  | { type: 'more' }
  | { type: 'report'; notes: string[]; title: string }
  | { type: 'bio' };

interface Toast { id: number; text: string; kind: 'ok' | 'err' | 'info' }

interface Store {
  game: GameState | null;
  version: number;
  screen: Screen;
  tab: Tab;
  modals: ModalState[];
  toasts: Toast[];
  setScreen: (s: Screen) => void;
  setTab: (t: Tab) => void;
  load: (s: GameState) => void;
  exit: () => void;
  act: <T>(fn: (s: GameState) => T, opts?: { save?: boolean; toast?: boolean | 'auto' }) => T;
  push: (...m: ModalState[]) => void;
  replace: (m: ModalState | null) => void;
  pop: () => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  save: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const gameRef = useRef<GameState | null>(null);
  const [version, setVersion] = useState(0);
  const [screen, setScreen] = useState<Screen>('menu');
  const [tab, setTab] = useState<Tab>('inicio');
  const [modals, setModals] = useState<ModalState[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tid = useRef(0);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    if (!text) return;
    const id = ++tid.current;
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const save = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    try {
      repo.save(g);
    } catch {
      toast('No se pudo guardar: el almacenamiento del navegador está lleno. Exportá la partida o eliminá otras.', 'err');
    }
  }, [toast]);

  const act = useCallback(<T,>(fn: (s: GameState) => T, opts: { save?: boolean; toast?: boolean | 'auto' } = {}): T => {
    const g = gameRef.current;
    if (!g) throw new Error('Sin partida');
    const r = fn(g);
    setVersion((v) => v + 1);
    if (opts.save !== false) save();
    if (opts.toast && typeof r === 'string') toast(r, /no |rechaz|necesit|insuficiente|inválid|cerrado|ya /i.test(r) ? 'err' : 'ok');
    return r;
  }, [save, toast]);

  const load = useCallback((s: GameState) => {
    gameRef.current = s;
    setVersion((v) => v + 1);
    setModals([]);
    setTab('inicio');
    setScreen('game');
    try {
      repo.save(s);
    } catch {
      /* el aviso aparece en el próximo guardado */
    }
  }, []);

  const exit = useCallback(() => {
    if (gameRef.current) save();
    gameRef.current = null;
    setModals([]);
    setScreen('menu');
    setVersion((v) => v + 1);
  }, [save]);

  const push = useCallback((...m: ModalState[]) => setModals((x) => [...x, ...m]), []);
  const replace = useCallback((m: ModalState | null) => setModals((x) => (m ? [...x.slice(0, -1), m] : x.slice(0, -1))), []);
  const pop = useCallback(() => setModals((x) => x.slice(0, -1)), []);

  const value = useMemo<Store>(() => ({ game: gameRef.current, version, screen, tab, modals, toasts, setScreen, setTab, load, exit, act, push, replace, pop, toast, save }), [version, screen, tab, modals, toasts, load, exit, act, push, replace, pop, toast, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('Store fuera de contexto');
  return c;
}

/** Acceso a la partida en curso (sólo dentro de la pantalla de juego). */
export function useGame() {
  const st = useStore();
  if (!st.game) throw new Error('Sin partida');
  return { ...st, s: st.game };
}
