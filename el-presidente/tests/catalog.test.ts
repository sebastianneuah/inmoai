// Cada acontecimiento del catálogo y cada una de sus opciones se ejecuta sin errores.
import { describe, it, expect } from 'vitest';
import { newGame, advanceWeek } from '../src/engine/game';
import { EVENTS, baseCtx, bindEvent, createPending, resolveEvent, render } from '../src/engine/events';
import { rngOf } from '../src/engine/rng';
import { joinCommittee, becomeBodyPresident } from '../src/engine/politics';
import { deepClone } from '../src/engine/util';
import type { GameState } from '../src/engine/types';

function baseState(pos: 'club' | 'asociacion' | 'confederacion' | 'fifa' | 'sin_cargo'): GameState {
  const s = newGame({ name: 'Cata', surname: 'Logo', nationality: 'ARG', age: 74, country: 'ARG', clubId: 'cl_est', difficulty: 'normal', personality: 'politico', mandateYears: 3, mode: 'detallado', seed: 9090 });
  for (let i = 0; i < 18; i++) { s.inbox = []; advanceWeek(s); }
  s.inbox = [];
  const rng = rngOf(s);
  if (pos === 'asociacion' || pos === 'confederacion' || pos === 'fifa') { joinCommittee(s); becomeBodyPresident(s, rng, 'asociacion'); }
  if (pos === 'confederacion' || pos === 'fifa') becomeBodyPresident(s, rng, 'confederacion');
  if (pos === 'fifa') becomeBodyPresident(s, rng, 'fifa');
  if (pos === 'sin_cargo') { s.president.pos = 'sin_cargo'; s.president.clubId = null; }
  // condiciones amplias para que los vínculos existan
  s.week = 3; // libro de pases abierto
  return s;
}

describe('Catálogo de acontecimientos', () => {
  it('todas las opciones se resuelven sin excepciones', () => {
    const states = { club: baseState('club'), asociacion: baseState('asociacion'), confederacion: baseState('confederacion'), fifa: baseState('fifa'), sin_cargo: baseState('sin_cargo') };
    const tested = new Set<string>();
    const failures: string[] = [];
    for (const def of Object.values(EVENTS)) {
      const positions = (def.pos ?? ['club']).includes('any') ? (['club'] as const) : (def.pos ?? ['club']);
      for (const pos of positions) {
        const base = (states as Record<string, GameState>)[pos];
        if (!base) continue;
        for (let oi = 0; oi < def.opts.length; oi++) {
          const s = deepClone(base);
          const rng = rngOf(s);
          const c = baseCtx(s, rng);
          let b: ReturnType<typeof bindEvent> = null;
          if (def.chain) {
            // los acontecimientos encadenados heredan los vínculos de su origen
            const cl = s.president.clubId;
            const star = cl ? Object.values(s.players).filter((p) => p.clubId === cl).sort((a, z) => z.ovr - a.ovr)[0] : undefined;
            const foreign = Object.values(s.clubs).find((x) => x.division === 0)!;
            const ch = Object.values(s.chars).find((x) => x.active && x.role === 'presidente_club' && x.clubId !== cl)!;
            const seed = { playerId: star?.id, agentId: star?.agentId ?? undefined, clubId: foreign.id, charId: ch.id, amount: 1_000_000 };
            const cc = baseCtx(s, rng, seed);
            const nb = def.bind ? bindEvent(def, cc) : null;
            c.b = { ...seed, ...(nb ?? {}) };
            const hc = baseCtx(s, rng, c.b);
            Object.assign(c, hc);
            b = c.b;
          } else {
            b = bindEvent(def, c);
            for (let tries = 0; !b && tries < 6; tries++) b = bindEvent(def, baseCtx(s, rng));
          }
          if (!b) continue; // vínculo imposible en este estado (p. ej. no hay lesionados)
          try {
            render(def.title, c);
            const pe = createPending(s, def, c);
            const r = resolveEvent(s, pe.uid, oi, false, rng);
            expect(r).toBeTruthy();
            for (const v of Object.values(s.ind)) if (!Number.isFinite(v)) throw new Error('indicador NaN');
            if (s.president.clubId && !Number.isFinite(s.clubs[s.president.clubId].fin.cash)) throw new Error('caja NaN');
            if (r!.outcome.includes('{')) throw new Error('plantilla sin resolver: ' + r!.outcome);
            if (pe.text.includes('{') || pe.title.includes('{')) throw new Error('plantilla sin resolver: ' + pe.title);
            tested.add(def.id);
          } catch (e) {
            failures.push(`${def.id}[${oi}]@${pos}: ${(e as Error).message}`);
          }
        }
        break;
      }
    }
    console.log(`Probados ${tested.size}/${Object.keys(EVENTS).length} acontecimientos`);
    expect(failures).toEqual([]);
    expect(tested.size).toBeGreaterThan(100);
  });
});
