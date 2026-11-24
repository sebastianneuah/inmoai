// Consultas de solo lectura sobre el estado.
import type { GameState, Club, Player, TableRow, Fixture, Character, Role, Coach, Competition } from './types';
import { absWeek } from './util';

export const userClub = (s: GameState): Club | null => (s.president.clubId ? s.clubs[s.president.clubId] ?? null : null);
export const abs = (s: GameState) => absWeek(s);

export function squad(s: GameState, clubId: string): Player[] {
  const out: Player[] = [];
  for (const p of Object.values(s.players)) if (p.clubId === clubId && !p.retired) out.push(p);
  return out;
}

const POS_ORDER = { POR: 0, DEF: 1, MED: 2, DEL: 3 } as const;
export function sortSquad(ps: Player[]) {
  return ps.sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.ovr - a.ovr);
}

export function bestXI(ps: Player[]): Player[] {
  const avail = ps.filter((p) => p.injury <= 0).sort((a, b) => b.ovr * (0.7 + p_fit(b)) - a.ovr * (0.7 + p_fit(a)));
  const need = { POR: 1, DEF: 4, MED: 4, DEL: 2 } as Record<string, number>;
  const xi: Player[] = [];
  for (const p of avail) {
    if (need[p.pos] > 0) {
      need[p.pos]--;
      xi.push(p);
    }
  }
  // completar con cualquiera si faltan
  for (const p of avail) {
    if (xi.length >= 11) break;
    if (!xi.includes(p)) xi.push(p);
  }
  return xi;
}
const p_fit = (p: Player) => p.fitness / 330;

export function sortTable(rows: TableRow[]): TableRow[] {
  return [...rows].sort((a, b) => b.pts - a.pts || b.gf - b.gc - (a.gf - a.gc) || b.gf - a.gf || a.id.localeCompare(b.id));
}

export function leagueOf(s: GameState, division: number): Competition | undefined {
  return Object.values(s.comps).find((c) => c.type === 'league' && c.scope === 'club' && c.division === division && c.season === s.season);
}

export function positionOf(s: GameState, clubId: string): { pos: number; of: number; comp?: Competition } {
  const c = s.clubs[clubId];
  const lg = c ? leagueOf(s, c.division) : undefined;
  if (!lg) return { pos: 0, of: 0 };
  const t = sortTable(lg.table);
  return { pos: t.findIndex((r) => r.id === clubId) + 1, of: t.length, comp: lg };
}

export function nextFixture(s: GameState, clubId: string, fromWeek = s.week): Fixture | undefined {
  return s.fixtures.filter((f) => !f.played && f.week >= fromWeek && (f.home === clubId || f.away === clubId)).sort((a, b) => a.week - b.week)[0];
}

export function teamName(s: GameState, id: string): string {
  return s.clubs[id]?.name ?? s.nations[id]?.name ?? id;
}
export function teamShort(s: GameState, id: string): string {
  return s.clubs[id]?.short ?? id;
}

export function charsByRole(s: GameState, role: Role, clubId?: string | null): Character[] {
  return Object.values(s.chars).filter((c) => c.active && c.role === role && (clubId === undefined || c.clubId === clubId));
}

export function staffChar(s: GameState, key: 'vicepresidente' | 'tesorero' | 'director_deportivo' | 'lider_barra' | 'lider_socios' | 'opositor'): Character | undefined {
  const c = userClub(s);
  const id = c?.staff?.[key];
  return id ? s.chars[id] : undefined;
}

export function clubCoach(s: GameState, clubId: string): Coach | undefined {
  const c = s.clubs[clubId];
  return c?.coachId ? s.coaches[c.coachId] : undefined;
}

export function careerLevel(s: GameState): number {
  const p = s.president;
  if (p.pos === 'fifa') return 6;
  if (p.pos === 'confederacion') return 5;
  if (p.pos === 'asociacion') return 4;
  if (p.pos === 'club') {
    if (p.committee) return 3;
    const c = userClub(s);
    if (c && c.division === 1 && c.prestige >= 70) return 2;
    return 1;
  }
  return 0;
}

export const LEVEL_NAMES = ['Sin cargo', 'Presidente de club', 'Presidente de club grande', 'Dirigente de la asociación', 'Presidente de la asociación nacional', 'Presidente de la confederación', 'Presidente de la FIF'];

export function userTeams(s: GameState): string[] {
  const out: string[] = [];
  if (s.president.clubId) out.push(s.president.clubId);
  if (s.president.pos === 'asociacion') out.push('ARG');
  return out;
}

export function lastResults(s: GameState, clubId: string, n = 5): Fixture[] {
  return s.fixtures.filter((f) => f.played && (f.home === clubId || f.away === clubId)).sort((a, b) => b.week - a.week).slice(0, n);
}

export function resultFor(f: Fixture, id: string): 'G' | 'E' | 'P' {
  const mine = f.home === id ? f.hg! : f.ag!;
  const theirs = f.home === id ? f.ag! : f.hg!;
  if (mine > theirs) return 'G';
  if (mine < theirs) return 'P';
  if (f.pens) {
    const [ph, pa] = f.pens;
    return (f.home === id ? ph > pa : pa > ph) ? 'G' : 'P';
  }
  return 'E';
}
