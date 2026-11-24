// Calendario, ligas, copas y torneos de selecciones.
import type { GameState, Competition, Fixture, TableRow, ID, Club } from './types';
import type { RNG } from './rng';
import { newId } from './util';
import { sortTable, leagueOf } from './queries';

export const LEAGUE_WEEKS_1 = Array.from({ length: 34 }, (_, i) => 4 + i); // 4..37
export const LEAGUE_WEEKS_3 = Array.from({ length: 30 }, (_, i) => 4 + i); // 4..33
export const TRANSFER_WINDOWS: [number, number][] = [[1, 4], [19, 21]];
export const ELIM_WEEKS = [8, 9, 15, 16, 20, 21, 31, 32, 36];

export const isWindowOpen = (week: number) => TRANSFER_WINDOWS.some(([a, b]) => week >= a && week <= b);

export function emptyRow(id: ID): TableRow {
  return { id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, form: [] };
}

/** Método del círculo. Devuelve rondas de partidos [local, visitante]. */
export function roundRobin(teams: ID[], double: boolean, rng: RNG): [ID, ID][][] {
  const t = [...teams];
  if (t.length % 2) t.push('BYE');
  rng.shuffle(t);
  const n = t.length;
  const rounds: [ID, ID][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [ID, ID][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i];
      const b = t[n - 1 - i];
      if (a === 'BYE' || b === 'BYE') continue;
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    t.splice(1, 0, t.pop()!);
  }
  if (double) {
    const second = rounds.map((rd) => rd.map(([a, b]) => [b, a] as [ID, ID]));
    return [...rounds, ...second];
  }
  return rounds;
}

function addFixture(s: GameState, f: Omit<Fixture, 'id' | 'played'>): Fixture {
  const fx: Fixture = { ...f, id: newId(s, 'f'), played: false };
  s.fixtures.push(fx);
  return fx;
}

function baseComp(s: GameState, o: Partial<Competition> & Pick<Competition, 'id' | 'name' | 'short' | 'type' | 'scope' | 'participants'>): Competition {
  return {
    season: s.season, table: [], koWeeks: [], koIndex: 0, koAlive: [], stage: o.type === 'league' ? 'league' : o.type === 'groups_ko' ? 'groups' : 'ko', prizeWin: 0, prizeRound: 0,
    ...o,
  } as Competition;
}

export function createLeague(s: GameState, rng: RNG, id: string, name: string, short: string, division: number, teams: ID[], weeks: number[], extra: Partial<Competition> = {}): Competition {
  const comp = baseComp(s, { id, name, short, type: 'league', scope: 'club', division, participants: teams, ...extra });
  comp.table = teams.map(emptyRow);
  const rounds = roundRobin(teams, true, rng);
  rounds.forEach((rd, i) => rd.forEach(([h, a]) => addFixture(s, { comp: id, week: weeks[i], round: `Fecha ${i + 1}`, home: h, away: a })));
  s.comps[id] = comp;
  return comp;
}

export function createKO(s: GameState, rng: RNG, o: { id: string; name: string; short: string; scope: 'club' | 'national'; teams: ID[]; koWeeks: { name: string; week: number }[]; prizeWin: number; prizeRound: number; neutral?: boolean; host?: string }): Competition {
  const comp = baseComp(s, { id: o.id, name: o.name, short: o.short, type: 'cup', scope: o.scope, participants: o.teams, koWeeks: o.koWeeks, prizeWin: o.prizeWin, prizeRound: o.prizeRound, host: o.host });
  comp.koAlive = rng.shuffle([...o.teams]);
  s.comps[o.id] = comp;
  scheduleKORound(s, comp, rng);
  return comp;
}

export function createGroupsKO(s: GameState, rng: RNG, o: { id: string; name: string; short: string; scope: 'club' | 'national'; teams: ID[]; groups: number; groupWeeks: number[]; double: boolean; koWeeks: { name: string; week: number }[]; advance: number; prizeWin: number; prizeRound: number; host?: string; seeded?: boolean }): Competition {
  const comp = baseComp(s, { id: o.id, name: o.name, short: o.short, type: 'groups_ko', scope: o.scope, participants: o.teams, koWeeks: o.koWeeks, prizeWin: o.prizeWin, prizeRound: o.prizeRound, advance: o.advance, host: o.host });
  const teams = o.seeded ? [...o.teams] : rng.shuffle([...o.teams]);
  // reparto serpenteante por bombos
  const groups: ID[][] = Array.from({ length: o.groups }, () => []);
  const pots = Math.ceil(teams.length / o.groups);
  for (let p = 0; p < pots; p++) {
    const pot = rng.shuffle(teams.slice(p * o.groups, (p + 1) * o.groups));
    pot.forEach((t, i) => groups[i].push(t));
  }
  const letters = 'ABCDEFGH';
  comp.groups = groups.map((g, i) => ({ name: `Grupo ${letters[i]}`, teams: g, table: g.map(emptyRow) }));
  comp.groups.forEach((g, gi) => {
    const rounds = roundRobin(g.teams, o.double, rng);
    rounds.forEach((rd, ri) => rd.forEach(([h, a]) => addFixture(s, { comp: o.id, week: o.groupWeeks[ri], round: `${g.name} · J${ri + 1}`, home: h, away: a, group: gi, national: o.scope === 'national', neutral: o.scope === 'national' && h !== o.host })));
  });
  s.comps[o.id] = comp;
  return comp;
}

function scheduleKORound(s: GameState, comp: Competition, rng: RNG) {
  const kw = comp.koWeeks[comp.koIndex];
  if (!kw) return;
  const alive = comp.koAlive;
  for (let i = 0; i + 1 < alive.length; i += 2) {
    let h = alive[i];
    let a = alive[i + 1];
    const isFinal = alive.length === 2;
    if (comp.scope === 'club' && !isFinal) {
      // en copas de clubes, juega de local el de menor categoría / al azar
      const ch = s.clubs[h];
      const ca = s.clubs[a];
      if (ch && ca && ch.division > 0 && ca.division > 0 && ca.division > ch.division) [h, a] = [a, h];
      else if (rng.chance(0.5)) [h, a] = [a, h];
    }
    const neutral = isFinal || (comp.scope === 'national' && h !== comp.host);
    addFixture(s, { comp: comp.id, week: kw.week, round: kw.name, home: h, away: a, neutral, national: comp.scope === 'national', koSlot: i / 2 });
  }
}

/** Actualiza tablas tras jugar un partido. */
export function recordResult(s: GameState, f: Fixture) {
  const comp = s.comps[f.comp];
  if (!comp) return;
  const apply = (rows: TableRow[]) => {
    const h = rows.find((r) => r.id === f.home);
    const a = rows.find((r) => r.id === f.away);
    if (!h || !a) return;
    const hg = f.hg!, ag = f.ag!;
    h.pj++; a.pj++;
    h.gf += hg; h.gc += ag; a.gf += ag; a.gc += hg;
    if (hg > ag) { h.g++; a.p++; h.pts += 3; h.form.push('G'); a.form.push('P'); }
    else if (hg < ag) { a.g++; h.p++; a.pts += 3; h.form.push('P'); a.form.push('G'); }
    else { h.e++; a.e++; h.pts++; a.pts++; h.form.push('E'); a.form.push('E'); }
    if (h.form.length > 5) h.form.shift();
    if (a.form.length > 5) a.form.shift();
  };
  if (comp.type === 'league' || (comp.persistent && comp.table.length)) apply(comp.table);
  else if (comp.groups && f.group !== undefined && comp.stage === 'groups') apply(comp.groups[f.group].table);
}

export function koWinner(f: Fixture): ID {
  if (f.hg! > f.ag!) return f.home;
  if (f.ag! > f.hg!) return f.away;
  return f.pens && f.pens[0] > f.pens[1] ? f.home : f.away;
}

/** Avanza fases de copas cuando una ronda se completa. Devuelve los clubes eliminados con premio. */
export function progressCompetitions(s: GameState, rng: RNG, week: number): { comp: Competition; finished: boolean }[] {
  const out: { comp: Competition; finished: boolean }[] = [];
  for (const comp of Object.values(s.comps)) {
    if (comp.stage === 'done') continue;
    const fx = s.fixtures.filter((f) => f.comp === comp.id);
    if (comp.stage === 'league') {
      if (fx.length && fx.every((f) => f.played)) {
        comp.stage = 'done';
        const t = sortTable(comp.table);
        comp.winner = t[0]?.id;
        comp.runnerUp = t[1]?.id;
        out.push({ comp, finished: true });
      }
      continue;
    }
    if (comp.stage === 'groups') {
      const gfx = fx.filter((f) => f.group !== undefined);
      if (gfx.length && gfx.every((f) => f.played)) {
        const adv = comp.advance ?? 2;
        const qualified: ID[][] = comp.groups!.map((g) => sortTable(g.table).slice(0, adv).map((r) => r.id));
        // cruces: 1A-2B, 1B-2A, 1C-2D, 1D-2C ...
        const alive: ID[] = [];
        for (let i = 0; i < qualified.length; i += 2) {
          const A = qualified[i], B = qualified[i + 1] ?? qualified[0];
          alive.push(A[0], B[1] ?? B[0], B[0], A[1] ?? A[0]);
        }
        comp.koAlive = [...new Set(alive)];
        if (comp.koAlive.length % 2) comp.koAlive.pop();
        comp.stage = 'ko';
        comp.koIndex = 0;
        scheduleKORound(s, comp, rng);
      }
      continue;
    }
    if (comp.stage === 'ko') {
      const kw = comp.koWeeks[comp.koIndex];
      if (!kw) continue;
      const roundFx = fx.filter((f) => f.round === kw.name && f.group === undefined);
      if (!roundFx.length || !roundFx.every((f) => f.played)) continue;
      const winners = roundFx.sort((a, b) => (a.koSlot ?? 0) - (b.koSlot ?? 0)).map(koWinner);
      if (winners.length === 1) {
        comp.winner = winners[0];
        const fin = roundFx[0];
        comp.runnerUp = fin.home === winners[0] ? fin.away : fin.home;
        comp.stage = 'done';
        comp.koAlive = winners;
        out.push({ comp, finished: true });
      } else {
        comp.koAlive = winners;
        comp.koIndex++;
        scheduleKORound(s, comp, rng);
        out.push({ comp, finished: false });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Temporada: creación de todas las competiciones.
// ---------------------------------------------------------------------------

export function setupSeasonCompetitions(s: GameState, rng: RNG) {
  const arg = Object.values(s.clubs).filter((c) => c.country === 'ARG');
  const d1 = arg.filter((c) => c.division === 1).map((c) => c.id);
  const d2 = arg.filter((c) => c.division === 2).map((c) => c.id);
  const d3 = arg.filter((c) => c.division === 3).map((c) => c.id);
  const y = s.season;
  createLeague(s, rng, `arg1_${y}`, 'Liga Profesional Argentina', 'LPA', 1, d1, LEAGUE_WEEKS_1, { prizeWin: 3_000_000, releg: 2, intlSpots: 4 });
  createLeague(s, rng, `arg2_${y}`, 'Primera Nacional', 'PN', 2, d2, LEAGUE_WEEKS_1, { prizeWin: 600_000, promo: 2, releg: 2 });
  createLeague(s, rng, `arg3_${y}`, 'Torneo Federal', 'TF', 3, d3, LEAGUE_WEEKS_3, { prizeWin: 150_000, promo: 2 });

  // Copa Argentina: 18 de primera + 10 de nacional + 4 del federal
  const copaTeams = [...d1, ...rng.shuffle([...d2]).slice(0, 10), ...rng.shuffle([...d3]).slice(0, 4)];
  createKO(s, rng, { id: `copa_${y}`, name: 'Copa Argentina', short: 'CA', scope: 'club', teams: copaTeams, koWeeks: [{ name: 'Dieciseisavos', week: 6 }, { name: 'Octavos', week: 12 }, { name: 'Cuartos', week: 19 }, { name: 'Semifinal', week: 27 }, { name: 'Final', week: 34 }], prizeWin: 1_200_000, prizeRound: 120_000 });

  // Copa Continental: 4 argentinos + 12 extranjeros
  const prev = s.seasons.length ? s.seasons[s.seasons.length - 1] : null;
  let argQ: ID[] = (s.flags[`intl_${y}`] as string | undefined)?.split(',').filter((id) => s.clubs[id]) ?? [];
  if (argQ.length < 4) {
    const top = [...arg].filter((c) => c.division === 1 && !argQ.includes(c.id)).sort((a, b) => b.prestige - a.prestige);
    argQ = [...argQ, ...top.slice(0, 4 - argQ.length).map((c) => c.id)];
  }
  void prev;
  const sa = Object.values(s.clubs).filter((c) => c.division === 0 && ['BRA', 'URU', 'CHI', 'COL'].includes(c.country));
  const byCountry = (cc: string, n: number) => rng.shuffle(sa.filter((c) => c.country === cc)).sort((a, b) => (b.strength! + rng.int(0, 6)) - (a.strength! + rng.int(0, 6))).slice(0, n).map((c) => c.id);
  const foreignQ = [...byCountry('BRA', 5), ...byCountry('URU', 2), ...byCountry('CHI', 2), ...byCountry('COL', 3)];
  const contTeams = [...argQ.slice(0, 4), ...foreignQ];
  // ordenar por fuerza para bombos
  const strengthOf = (id: ID) => s.clubs[id].strength ?? s.clubs[id].prestige * 0.4 + 40;
  contTeams.sort((a, b) => strengthOf(b) - strengthOf(a));
  createGroupsKO(s, rng, { id: `cont_${y}`, name: 'Copa Continental', short: 'CC', scope: 'club', teams: contTeams, groups: 4, groupWeeks: [7, 9, 11, 14, 16, 18], double: true, koWeeks: [{ name: 'Cuartos', week: 22 }, { name: 'Semifinal', week: 28 }, { name: 'Final', week: 35 }], advance: 2, prizeWin: 8_000_000, prizeRound: 1_000_000, seeded: true });

  setupNationalCompetitions(s, rng);
}

/** Mundial de Clubes al final de temporada (semana 38). */
export function setupClubWorldCup(s: GameState, rng: RNG) {
  const y = s.season;
  if (s.comps[`mdc_${y}`]) return;
  const cont = s.comps[`cont_${y}`];
  const sa = cont?.winner ?? null;
  const pickTop = (countries: string[]) => {
    const pool = Object.values(s.clubs).filter((c) => c.division === 0 && countries.includes(c.country));
    return rng.weighted(pool, (c) => Math.pow(c.strength!, 3))!.id;
  };
  const teams = [sa ?? pickTop(['BRA']), pickTop(['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'POR']), pickTop(['MEX', 'USA']), pickTop(['KSA'])];
  createKO(s, rng, { id: `mdc_${y}`, name: 'Mundial de Clubes', short: 'MC', scope: 'club', teams, koWeeks: [{ name: 'Semifinal', week: 38 }, { name: 'Final', week: 39 }], prizeWin: 20_000_000, prizeRound: 5_000_000 });
}

export const isWorldCupYear = (y: number) => y % 4 === 2;
export const isAmericasYear = (y: number) => y % 4 === 0;

export function setupNationalCompetitions(s: GameState, rng: RNG) {
  const y = s.season;
  const csf = Object.values(s.nations).filter((n) => n.confed === 'CSF').map((n) => n.code);
  // Eliminatorias: 18 fechas repartidas en las dos temporadas previas al Mundial
  if (y % 4 === 0) {
    const elimId = `elim_${y + 2}`;
    if (!s.comps[elimId]) {
      const comp = baseComp(s, { id: elimId, name: `Eliminatorias Sudamericanas ${y + 2}`, short: 'ELIM', type: 'league', scope: 'national', participants: csf, persistent: true });
      comp.table = csf.map(emptyRow);
      const rounds = roundRobin(csf, true, rng);
      rounds.slice(0, 9).forEach((rd, i) => rd.forEach(([h, a]) => addFixture(s, { comp: elimId, week: ELIM_WEEKS[i], round: `Fecha ${i + 1}`, home: h, away: a, national: true })));
      comp.carry = rounds.slice(9);
      s.comps[elimId] = comp;
    }
  } else if (y % 4 === 1) {
    const existing = s.comps[`elim_${y + 1}`];
    if (existing && existing.carry && existing.carry.length) {
      existing.season = y;
      existing.carry.forEach((rd, i) => rd.forEach(([h, a]) => addFixture(s, { comp: existing.id, week: ELIM_WEEKS[i], round: `Fecha ${10 + i}`, home: h, away: a, national: true })));
      existing.carry = [];
      existing.stage = 'league';
      existing.winner = null;
    }
  }
  if (isAmericasYear(y)) {
    const teams = [...csf, 'MEX', 'USA', 'CAN', 'CRC', 'PAN', 'JAM'].sort((a, b) => s.nations[b].strength - s.nations[a].strength);
    createGroupsKO(s, rng, { id: `ame_${y}`, name: `Copa de las Américas ${y}`, short: 'CAM', scope: 'national', teams, groups: 4, groupWeeks: [24, 25, 26], double: false, koWeeks: [{ name: 'Cuartos', week: 27 }, { name: 'Semifinal', week: 28 }, { name: 'Final', week: 29 }], advance: 2, prizeWin: 16_000_000, prizeRound: 2_000_000, seeded: true });
  }
  if (isWorldCupYear(y)) {
    const host = (s.fifa.hostDecided?.[y] as string | undefined) ?? 'USA';
    const elim = s.comps[`elim_${y}`];
    let csfQ: string[];
    if (elim && elim.table.some((r) => r.pj > 0)) csfQ = sortTable(elim.table).slice(0, 6).map((r) => r.id);
    else csfQ = [...csf].sort((a, b) => s.nations[b].strength + rng.int(0, 8) - (s.nations[a].strength + rng.int(0, 8))).slice(0, 6);
    if (elim) elim.stage = 'done';
    const slots: Record<string, number> = { EUF: 13, AFC: 5, ASF: 4, NCF: 3, OCF: 0 };
    const teams = new Set<string>([host, ...csfQ]);
    for (const [cf, n] of Object.entries(slots)) {
      const pool = Object.values(s.nations).filter((x) => x.confed === cf && !teams.has(x.code)).sort((a, b) => b.strength + rng.int(0, 7) - (a.strength + rng.int(0, 7)));
      pool.slice(0, n).forEach((x) => teams.add(x.code));
    }
    const rest = Object.values(s.nations).filter((x) => !teams.has(x.code)).sort((a, b) => b.strength - a.strength);
    while (teams.size < 32 && rest.length) teams.add(rest.shift()!.code);
    const list = [...teams].slice(0, 32).sort((a, b) => (a === host ? -1 : b === host ? 1 : s.nations[b].strength - s.nations[a].strength));
    createGroupsKO(s, rng, { id: `wc_${y}`, name: `Copa del Mundo ${y}`, short: 'MUN', scope: 'national', teams: list, groups: 8, groupWeeks: [24, 25, 26], double: false, koWeeks: [{ name: 'Octavos', week: 27 }, { name: 'Cuartos', week: 28 }, { name: 'Semifinal', week: 29 }, { name: 'Final', week: 30 }], advance: 2, prizeWin: 42_000_000, prizeRound: 9_000_000, host, seeded: true });
    s.nt.qualified = list.includes('ARG');
  }
}

/** Ascensos, descensos y clasificación internacional al cerrar la temporada. */
export function applyPromotionRelegation(s: GameState): { promoted: Club[]; relegated: Club[]; intl: string[] } {
  const promoted: Club[] = [];
  const relegated: Club[] = [];
  const l1 = leagueOf(s, 1), l2 = leagueOf(s, 2), l3 = leagueOf(s, 3);
  if (!l1 || !l2 || !l3) return { promoted, relegated, intl: [] };
  const t1 = sortTable(l1.table), t2 = sortTable(l2.table), t3 = sortTable(l3.table);
  const nR = Number(s.assoc.rules.descensos ?? 2);
  const down1 = t1.slice(-nR).map((r) => s.clubs[r.id]);
  const up2 = t2.slice(0, nR).map((r) => s.clubs[r.id]);
  const down2 = t2.slice(-2).map((r) => s.clubs[r.id]);
  const up3 = t3.slice(0, 2).map((r) => s.clubs[r.id]);
  down1.forEach((c) => (c.division = 2));
  up2.forEach((c) => (c.division = 1));
  down2.forEach((c) => (c.division = 3));
  up3.forEach((c) => (c.division = 2));
  promoted.push(...up2, ...up3);
  relegated.push(...down1, ...down2);
  // Clasificación internacional: top 3 de liga + campeón de copa (o 4º)
  const intl = t1.slice(0, 3).map((r) => r.id);
  const copa = s.comps[`copa_${s.season}`];
  if (copa?.winner && !intl.includes(copa.winner) && s.clubs[copa.winner].division === 1) intl.push(copa.winner);
  for (const r of t1.slice(3)) {
    if (intl.length >= 4) break;
    if (!intl.includes(r.id) && s.clubs[r.id].division === 1) intl.push(r.id);
  }
  s.flags[`intl_${s.season + 1}`] = intl.filter((id) => s.clubs[id].division === 1).join(',');
  return { promoted, relegated, intl };
}
