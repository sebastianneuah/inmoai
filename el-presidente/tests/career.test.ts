// Progresión profesional: comité, AAF, confederación, FIF; derrota electoral y regreso.
import { describe, it, expect } from 'vitest';
import { newGame, advanceWeek } from '../src/engine/game';
import { resolveEvent, EVENTS } from '../src/engine/events';
import { rngOf } from '../src/engine/rng';
import { joinCommittee, startBodyElection, startClubElection, resolveElection, runForClub, clubsWithElections, joinBodyElection } from '../src/engine/politics';
import { serialize, deserialize } from '../src/engine/save';
import { charsByRole } from '../src/engine/queries';
import type { GameState } from '../src/engine/types';

function clearInbox(s: GameState) {
  let g = 0;
  while (s.inbox.length && g++ < 30) {
    const e = s.inbox[0];
    const d = EVENTS[e.defId];
    resolveEvent(s, e.uid, Math.max(0, d.opts.findIndex((o) => o.auto)));
  }
}
function weeks(s: GameState, n: number) {
  for (let i = 0; i < n && !s.gameOver; i++) {
    clearInbox(s);
    advanceWeek(s);
  }
}
function rig(s: GameState, kind: string) {
  // todos los electores aman al usuario
  for (const c of Object.values(s.chars)) c.opinion = 95;
  s.ind.influencia = 95; s.ind.repNacional = 95; s.ind.repInternacional = 95; s.ind.presidentes = 95; s.ind.socios = 95;
  void kind;
}

describe('Carrera', () => {
  it('asciende del club a la FIF ganando elecciones', () => {
    const s = newGame({ name: 'Ana', surname: 'Poder', nationality: 'ARG', age: 45, country: 'ARG', clubId: 'cl_rib', difficulty: 'normal', personality: 'politico', mandateYears: 4, mode: 'normal', seed: 2024 });
    const rng = rngOf(s);
    weeks(s, 5);
    joinCommittee(s);
    expect(s.president.committee).toBe(true);
    rig(s, 'asociacion');
    s.election = null;
    startBodyElection(s, rng, 'asociacion', false);
    expect(joinBodyElection(s, rng)).toContain('Lanzaste');
    rig(s, 'asociacion');
    resolveElection(s, rng);
    expect(s.president.pos).toBe('asociacion');
    expect(s.president.clubId).toBeNull();
    s.election = null;
    weeks(s, 45); // una temporada al frente de la AAF (selección, presupuesto, eventos)
    expect(['asociacion', 'sin_cargo']).toContain(s.president.pos);
    if (s.president.pos !== 'asociacion') return;
    rig(s, 'confederacion');
    s.election = null;
    startBodyElection(s, rng, 'confederacion', false);
    joinBodyElection(s, rng);
    rig(s, 'confederacion');
    resolveElection(s, rng);
    expect(s.president.pos).toBe('confederacion');
    s.election = null;
    weeks(s, 10);
    rig(s, 'fifa');
    s.election = null;
    startBodyElection(s, rng, 'fifa', false);
    joinBodyElection(s, rng);
    rig(s, 'fifa');
    resolveElection(s, rng);
    expect(s.president.pos).toBe('fifa');
    s.election = null;
    weeks(s, 12);
    expect(s.career.peakLevel).toBe(6);
    expect(deserialize(serialize(s))?.president.pos).toBe('fifa');
  });

  it('pierde la elección del club, queda sin cargo y vuelve en otro club', () => {
    const s = newGame({ name: 'Beto', surname: 'Caído', nationality: 'ARG', age: 50, country: 'ARG', clubId: 'cl_tem', difficulty: 'normal', personality: 'hincha', mandateYears: 2, mode: 'normal', seed: 77 });
    const rng = rngOf(s);
    weeks(s, 3);
    startClubElection(s, rng, s.president.clubId!, true, 0);
    s.ind.socios = 0; s.ind.hinchas = 0; s.ind.prestigio = 0; s.ind.estabilidad = 0; s.ind.integridad = 0; s.ind.comision = 0;
    resolveElection(s, rng);
    expect(s.president.pos).toBe('sin_cargo');
    expect(s.president.clubId).toBeNull();
    s.election = null;
    weeks(s, 6); // el mundo sigue sin el usuario
    const target = clubsWithElections(s)[0];
    expect(target).toBeTruthy();
    expect(runForClub(s, rng, target.id)).toContain('Lanzaste');
    s.ind.repNacional = 100; s.ind.integridad = 100; s.ind.influencia = 100;
    resolveElection(s, rng);
    expect(s.president.pos).toBe('club');
    expect(s.president.clubId).toBe(target.id);
    weeks(s, 8);
    expect(s.career.clubs.length).toBe(2);
    void charsByRole;
  });
});
