// Simulación headless: crea partidas y las juega varias temporadas tomando decisiones
// aleatorias, verificando invariantes del motor (sin duplicados, calendario coherente, etc.).
import { describe, it, expect } from 'vitest';
import { newGame, advanceWeek, blockingReason, eventCount } from '../src/engine/game';
import { resolveEvent, EVENTS, optionAvailable, baseCtx } from '../src/engine/events';
import { rngOf, mulberry } from '../src/engine/rng';
import { serialize, deserialize } from '../src/engine/save';
import { sortTable, leagueOf, squad, userClub } from '../src/engine/queries';
import type { GameState } from '../src/engine/types';

function checkInvariants(s: GameState) {
  // jugadores: ids únicos y club válido
  for (const p of Object.values(s.players)) {
    if (p.clubId) expect(s.clubs[p.clubId], `club de ${p.name}`).toBeTruthy();
    expect(Number.isFinite(p.ovr)).toBe(true);
    expect(p.ovr).toBeGreaterThanOrEqual(30);
    expect(p.ovr).toBeLessThanOrEqual(99);
    expect(p.injury).toBeGreaterThanOrEqual(0);
  }
  // calendario: ningún equipo juega dos veces la misma semana en la misma competición
  const seen = new Set<string>();
  for (const f of s.fixtures) {
    for (const t of [f.home, f.away]) {
      const k = `${f.comp}|${f.week}|${t}`;
      expect(seen.has(k), `duplicado ${k}`).toBe(false);
      seen.add(k);
    }
    if (f.played) {
      expect(f.hg! >= 0 && f.ag! >= 0).toBe(true);
    }
  }
  // indicadores en rango
  for (const v of Object.values(s.ind)) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  }
  // ligas: 18/18/16 equipos
  const l1 = leagueOf(s, 1);
  if (l1) expect(l1.table.length).toBe(18);
  expect(Number.isFinite(s.president.wealth)).toBe(true);
  const c = userClub(s);
  if (c) expect(Number.isFinite(c.fin.cash)).toBe(true);
}

function playSeasons(seed: number, seasons: number, clubId: string, strategy: 'random' | 'first' | 'auto') {
  const s = newGame({ name: 'Test', surname: 'Presidente', nationality: 'ARG', age: 45, country: 'ARG', clubId, difficulty: 'normal', personality: 'empresario', mandateYears: 2, mode: 'normal', seed });
  const pick = mulberry({ v: seed + 7 });
  const target = s.season + seasons;
  let guard = 0;
  let decisions = 0;
  while (s.season < target && !s.gameOver && guard++ < 2000) {
    // resolver decisiones
    let g2 = 0;
    while (s.inbox.length && g2++ < 20) {
      const e = s.inbox[0];
      const def = EVENTS[e.defId];
      const ctx = baseCtx(s, rngOf(s), e.b);
      const avail = def.opts.map((o, i) => ({ o, i })).filter((x) => optionAvailable(ctx, x.o));
      const idx = strategy === 'first' ? avail[0]?.i ?? 0 : strategy === 'auto' ? Math.max(0, def.opts.findIndex((o) => o.auto)) : avail[Math.floor(pick.next() * avail.length)]?.i ?? 0;
      resolveEvent(s, e.uid, idx);
      decisions++;
    }
    expect(blockingReason(s)).toBeNull();
    advanceWeek(s);
    if (s.week % 10 === 0) checkInvariants(s);
  }
  checkInvariants(s);
  return { s, decisions };
}

describe('EL PRESIDENTE — motor', () => {
  it('tiene al menos 120 acontecimientos con 3+ opciones', () => {
    expect(eventCount()).toBeGreaterThanOrEqual(120);
    for (const d of Object.values(EVENTS)) expect(d.opts.length, d.id).toBeGreaterThanOrEqual(3);
  });

  it('juega 3 temporadas con decisiones aleatorias en un club de primera', () => {
    const { s, decisions } = playSeasons(12345, 3, 'cl_ban'.replace('ban', 'gra'), 'random');
    expect(s.seasons.length).toBeGreaterThanOrEqual(1);
    expect(decisions).toBeGreaterThan(10);
    expect(Object.keys(s.seasons[0].champions).length).toBeGreaterThan(2);
  });

  it('juega 3 temporadas en el ascenso con decisiones conservadoras', () => {
    const { s } = playSeasons(999, 3, 'cl_que'.replace('que', 'qui'), 'auto');
    expect(s.seasons.length).toBeGreaterThanOrEqual(1);
  });

  it('juega 4 temporadas con un grande eligiendo siempre la primera opción', () => {
    const { s } = playSeasons(4242, 4, 'cl_por', 'first');
    expect(s.seasons.length).toBeGreaterThanOrEqual(1);
  });

  it('es reproducible con la misma semilla', () => {
    const a = playSeasons(777, 1, 'cl_tal', 'first').s;
    const b = playSeasons(777, 1, 'cl_tal', 'first').s;
    expect(sortTable(a.seasons[0] ? (Object.values(a.comps)[0]?.table ?? []) : []).map((r) => r.pts)).toEqual(sortTable(b.seasons[0] ? (Object.values(b.comps)[0]?.table ?? []) : []).map((r) => r.pts));
    expect(a.seasons[0].champions).toEqual(b.seasons[0].champions);
  });

  it('guarda y recupera la partida sin pérdidas', () => {
    const { s } = playSeasons(31337, 1, 'cl_ind', 'auto');
    const raw = serialize(s);
    const back = deserialize(raw)!;
    expect(back.season).toBe(s.season);
    expect(Object.keys(back.players).length).toBe(Object.keys(s.players).length);
    expect(squad(back, back.president.clubId ?? '').length).toBe(squad(s, s.president.clubId ?? '').length);
    // tamaño razonable para almacenamiento local
    expect(raw.length * 2).toBeLessThan(4_500_000);
  });
});
