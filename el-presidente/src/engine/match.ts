// Motor de simulación de partidos. El presidente no controla tácticas: el resultado
// surge de plantel, entrenador, moral, lesiones, cansancio, localía, racha,
// estabilidad institucional, presión ambiental y una aleatoriedad equilibrada.
import type { GameState, Fixture, Player, MatchEvent, MatchStats, ID } from './types';
import type { RNG } from './rng';
import { bestXI, squad, userClub } from './queries';
import { clamp, avg } from './util';
import { DIFFICULTIES } from './data/world';
import { ticketBase } from './valuation';

export interface TeamPower { rating: number; xi: Player[]; breakdown: Record<string, number> }

export function teamPower(s: GameState, id: ID, isHome: boolean, neutral: boolean): TeamPower {
  const breakdown: Record<string, number> = {};
  // Selecciones nacionales
  if (s.nations[id] && !s.clubs[id]) {
    if (id === 'ARG') {
      const pool = Object.values(s.players).filter((p) => p.nat === 'ARG' && !p.retired && p.clubId && p.age <= 36 && p.injury <= 0).sort((a, b) => b.ovr - a.ovr).slice(0, 26);
      const xi = bestXI(pool);
      // escala comparable con la fuerza de las demás selecciones (las potencias rondan 85-88)
      const base = 84 + (avg(xi.map((p) => p.ovr)) - 86) * 0.45;
      const coach = s.nt.coachId ? s.coaches[s.nt.coachId] : null;
      breakdown.plantel = base;
      breakdown.dt = coach ? (coach.ability - 70) * 0.08 : -2;
      breakdown.moral = (s.nt.morale - 60) * 0.04;
      breakdown.localia = isHome && !neutral ? 2.5 : 0;
      const r = Object.values(breakdown).reduce((a, b) => a + b, 0);
      return { rating: r, xi, breakdown };
    }
    const n = s.nations[id];
    breakdown.plantel = n.strength;
    breakdown.localia = isHome && !neutral ? 2.5 : 0;
    return { rating: n.strength + breakdown.localia, xi: [], breakdown };
  }
  const club = s.clubs[id];
  const pl = squad(s, id);
  const xi = bestXI(pl);
  const base = xi.length ? avg(xi.map((p) => p.ovr * (0.88 + (p.fitness / 100) * 0.12))) : 40;
  breakdown.plantel = base;
  if (xi.length < 11) breakdown.faltantes = -(11 - xi.length) * 3;
  const coach = club.coachId ? s.coaches[club.coachId] : null;
  breakdown.dt = coach ? (coach.ability - 60) * 0.08 + (coach.squadRel - 60) * 0.02 : -3;
  breakdown.moral = (avg(xi.map((p) => p.morale)) - 60) * 0.05;
  breakdown.localia = isHome && !neutral ? 2.6 : 0;
  const form = club.form.slice(-5);
  breakdown.racha = (form.filter((x) => x === 'G').length - form.filter((x) => x === 'P').length) * 0.3;
  const uc = userClub(s);
  if (uc && uc.id === id) {
    const ind = s.ind;
    breakdown.institucional = (ind.jugadores - 50) * 0.04 + (ind.gobernabilidad - 50) * 0.02 + (ind.dt - 50) * 0.02;
    if (isHome) breakdown.ambiente = (ind.hinchas - 50) * 0.02;
    const premio = Number(s.flags.premioPartido ?? 0);
    if (premio > 0) breakdown.premios = 1.2;
    breakdown.suerte = (DIFFICULTIES[s.settings.difficulty].luck - 1) * 18;
    if (s.economy.emergency) breakdown.emergencia = -0.8;
    if (uc.fin.wageArrears >= 2) breakdown.atrasos = -Math.min(4, uc.fin.wageArrears * 0.8);
    if (s.flags.huelgaJugadores) breakdown.huelga = -6;
  } else if (club.division > 0) {
    if (club.fin.wageArrears >= 2) breakdown.atrasos = -2;
  }
  const r = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { rating: r, xi, breakdown };
}

function pickScorer(rng: RNG, xi: Player[]): Player | undefined {
  if (!xi.length) return undefined;
  const w = { POR: 0.02, DEF: 0.6, MED: 2.0, DEL: 4.5 } as const;
  return rng.weighted(xi, (p) => w[p.pos] * Math.pow(p.ovr / 70, 3));
}

export interface SimOptions { detail: boolean; isUser: boolean }

export function simulateFixture(s: GameState, rng: RNG, f: Fixture, opts: SimOptions) {
  const home = teamPower(s, f.home, true, !!f.neutral);
  const away = teamPower(s, f.away, false, !!f.neutral);
  const diff = home.rating - away.rating;
  const lh = clamp(1.28 * Math.exp(diff * 0.06), 0.15, 4.5);
  const la = clamp(1.1 * Math.exp(-diff * 0.06), 0.15, 4.5);
  let hg = rng.poisson(lh);
  let ag = rng.poisson(la);
  hg = Math.min(hg, 8);
  ag = Math.min(ag, 8);
  f.hg = hg;
  f.ag = ag;
  f.played = true;

  const nameOf = (side: 'h' | 'a', p?: Player) => p?.name ?? (s.nations[side === 'h' ? f.home : f.away]?.roster ? rng.pick(s.nations[side === 'h' ? f.home : f.away].roster) : 'Jugador');
  const scorers: Fixture['scorers'] = [];
  const events: MatchEvent[] = [];
  const minutes = (n: number) => Array.from({ length: n }, () => rng.int(1, 94)).sort((a, b) => a - b);
  const sides: ['h' | 'a', number, TeamPower][] = [['h', hg, home], ['a', ag, away]];
  for (const [side, goals, tp] of sides) {
    for (const m of minutes(goals)) {
      const sc = pickScorer(rng, tp.xi);
      const ast = rng.chance(0.7) ? pickScorer(rng, tp.xi.filter((p) => p !== sc)) : undefined;
      const pen = rng.chance(0.1);
      const name = sc ? sc.name : nameOf(side);
      scorers.push({ t: side, p: sc ? sc.id : name, m });
      if (sc) {
        sc.season.goals++;
        sc.career.goals++;
      }
      if (ast) ast.season.assists++;
      events.push({ min: m, type: pen ? 'penal' : 'gol', team: side, playerId: sc?.id, playerName: name, text: pen ? `¡Penal! ${name} lo cambia por gol.` : ast ? `¡GOL! ${name} define tras una asistencia de ${ast.name}.` : `¡GOL! ${name} la manda a guardar.` });
    }
  }
  f.scorers = scorers.sort((a, b) => a.m - b.m);

  // Estadísticas
  const pos = clamp(Math.round(50 + diff * 1.1 + rng.int(-6, 6)), 28, 72);
  const shotsH = hg + rng.poisson(lh * 5 + 3);
  const shotsA = ag + rng.poisson(la * 5 + 2);
  const onH = Math.min(shotsH, hg + rng.poisson(lh * 1.6 + 1));
  const onA = Math.min(shotsA, ag + rng.poisson(la * 1.6 + 1));
  const yH = rng.poisson(2.1), yA = rng.poisson(2.3);
  const rH = rng.chance(0.05) ? 1 : 0, rA = rng.chance(0.06) ? 1 : 0;
  const club = s.clubs[f.home];
  let att = 0, gate = 0;
  if (club && club.division > 0) {
    const a = attendanceFor(s, f.home, f.away);
    att = a.att;
    gate = a.gate;
  } else if (club) att = Math.round(club.stadium.capacity * rng.float(0.6, 0.98));
  else att = rng.int(25000, 80000);
  const stats: MatchStats = { posH: pos, shotsH, shotsA, onH, onA, yH, yA, rH, rA, att, gate, xgH: Math.round(lh * 100) / 100, xgA: Math.round(la * 100) / 100 };
  f.stats = stats;

  // Apariciones, cansancio, tarjetas, lesiones
  for (const [side, , tp] of sides) {
    for (const p of tp.xi) {
      p.season.apps++;
      p.career.apps++;
      p.fitness = clamp(p.fitness - rng.int(6, 12));
      const rating = 6 + (side === 'h' ? hg - ag : ag - hg) * 0.25 + (p.ovr - 65) * 0.03 + rng.float(-0.8, 0.8);
      p.season.rating = p.season.apps > 1 ? (p.season.rating * (p.season.apps - 1) + rating) / p.season.apps : rating;
    }
    const injP = 0.07 * (s.clubs[side === 'h' ? f.home : f.away]?.facilities ? 1.2 - (s.clubs[side === 'h' ? f.home : f.away].facilities.medico - 1) * 0.08 : 1);
    if (tp.xi.length && rng.chance(injP)) {
      const p = rng.pick(tp.xi);
      const w = rng.weighted([1, 2, 3, 4, 6, 8, 12, 20], (x) => (x <= 3 ? 5 : x <= 8 ? 2 : 0.6))!;
      p.injury = w;
      const m = rng.int(5, 88);
      events.push({ min: m, type: 'lesion', team: side, playerId: p.id, playerName: p.name, text: `${p.name} se retira lesionado (${w} ${w === 1 ? 'semana' : 'semanas'} de baja estimada).` });
    }
    const ny = side === 'h' ? yH : yA;
    for (let i = 0; i < ny && tp.xi.length; i++) {
      const p = rng.pick(tp.xi);
      p.season.cards++;
      if (opts.detail) events.push({ min: rng.int(8, 90), type: 'amarilla', team: side, playerId: p.id, playerName: p.name, text: `Tarjeta amarilla para ${p.name}.` });
    }
    if ((side === 'h' ? rH : rA) && tp.xi.length) {
      const p = rng.pick(tp.xi);
      events.push({ min: rng.int(30, 89), type: 'roja', team: side, playerId: p.id, playerName: p.name, text: `¡Expulsado! ${p.name} ve la roja directa.` });
    }
  }

  if (opts.detail) {
    const chances = rng.int(3, 7);
    for (let i = 0; i < chances; i++) {
      const side: 'h' | 'a' = rng.chance(pos / 100) ? 'h' : 'a';
      const tp = side === 'h' ? home : away;
      const p = pickScorer(rng, tp.xi);
      const nm = p?.name ?? nameOf(side);
      const t = rng.pick([
        `Ocasión clarísima de ${nm}, que la tira apenas desviada.`,
        `Remate de ${nm} que se estrella en el palo.`,
        `Gran atajada ante el disparo de ${nm}.`,
        `${nm} no llega por centímetros a conectar el centro.`,
        `Tiro libre de ${nm} que pasa cerca del ángulo.`,
      ]);
      events.push({ min: rng.int(3, 90), type: t.includes('atajada') ? 'atajada' : 'ocasion', team: side, playerId: p?.id, playerName: nm, text: t });
    }
    if (rng.chance(0.08)) {
      const side: 'h' | 'a' = rng.chance(0.5) ? 'h' : 'a';
      const tp = side === 'h' ? home : away;
      const p = pickScorer(rng, tp.xi);
      events.push({ min: rng.int(10, 88), type: 'penal_errado', team: side, playerId: p?.id, playerName: p?.name, text: `¡Penal errado! ${p?.name ?? 'El ejecutante'} no puede convertir.` });
    }
    if (rng.chance(0.12)) events.push({ min: rng.int(15, 85), type: 'var', team: null, text: 'El VAR revisa una jugada polémica en el área... el árbitro mantiene su decisión.' });
    events.push({ min: 0, type: 'inicio', team: null, text: `Rueda la pelota. ${att ? `${att.toLocaleString('es-AR')} espectadores.` : ''}` });
    events.push({ min: 45, type: 'entretiempo', team: null, text: 'Final del primer tiempo.' });
  }

  // Penales en eliminación directa
  const comp = s.comps[f.comp];
  const isKO = comp && (comp.type === 'cup' || comp.stage === 'ko') && f.group === undefined && comp.type !== 'league';
  if (isKO && hg === ag) {
    let ph = 0, pa = 0;
    for (let i = 0; i < 5; i++) {
      if (rng.chance(0.76)) ph++;
      if (rng.chance(0.74)) pa++;
    }
    while (ph === pa) {
      if (rng.chance(0.75)) ph++;
      if (rng.chance(0.75)) pa++;
    }
    f.pens = [ph, pa];
    events.push({ min: 120, type: 'final', team: null, text: `Definición por penales: ${ph}-${pa}.` });
  }
  events.push({ min: 95, type: 'final', team: null, text: `Final del partido: ${hg}-${ag}.` });
  f.events = opts.detail ? events.sort((a, b) => a.min - b.min) : events.filter((e) => e.type === 'gol' || e.type === 'penal' || e.type === 'lesion' || e.type === 'roja' || e.type === 'final');

  // Moral y forma
  const res = (side: 'h' | 'a') => {
    const my = side === 'h' ? hg : ag, th = side === 'h' ? ag : hg;
    if (my > th || (my === th && f.pens && (side === 'h' ? f.pens[0] > f.pens[1] : f.pens[1] > f.pens[0]))) return 'G';
    if (my < th || f.pens) return 'P';
    return 'E';
  };
  for (const side of ['h', 'a'] as const) {
    const id = side === 'h' ? f.home : f.away;
    const c = s.clubs[id];
    if (!c) continue;
    const r = res(side);
    c.form.push(r);
    if (c.form.length > 10) c.form.shift();
    const dm = r === 'G' ? 3 : r === 'P' ? -3 : 0;
    for (const p of squad(s, id)) p.morale = clamp(p.morale + dm + (p.season.apps === 0 ? -0.3 : 0));
    const co = c.coachId ? s.coaches[c.coachId] : null;
    if (co) co.confidence = clamp(co.confidence + (r === 'G' ? 3 : r === 'P' ? -4 : -0.5));
  }
  return { home, away };
}

export function attendanceFor(s: GameState, homeId: ID, awayId: ID): { att: number; gate: number; fill: number; price: number } {
  const c = s.clubs[homeId];
  const rival = s.clubs[awayId];
  const isUser = s.president.clubId === homeId;
  const hinchas = isUser ? s.ind.hinchas : 55;
  const priceMult = isUser ? s.economy.ticketMult : 1;
  const form = c.form.slice(-5);
  const formF = (form.filter((x) => x === 'G').length - form.filter((x) => x === 'P').length) * 0.025;
  const big = rival ? (rival.prestige - 60) / 250 : 0.05;
  const derby = c.rivalId === awayId ? 0.25 : 0;
  let fill = 0.28 + c.prestige / 230 + (hinchas - 50) / 220 + formF + big + derby - (priceMult - 1) * 0.45;
  if (isUser && s.flags.visitantesProhibidos) fill -= 0.04;
  fill = clamp(fill, 0.12, 1);
  const att = Math.round(c.stadium.capacity * fill);
  const price = ticketBase(c) * priceMult;
  // la mitad del público son socios con abono (ya pagan cuota)
  const gate = Math.round(att * 0.55 * price);
  return { att, gate, fill, price };
}
