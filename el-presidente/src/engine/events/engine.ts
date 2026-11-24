// ============================================================================
// Motor de acontecimientos dinámicos.
// Cada acontecimiento es un dato (EventDef) con requisitos, vínculos a personajes
// y entidades, probabilidad, urgencia, gravedad, opciones y consecuencias
// inmediatas, ocultas y futuras. Las variables dinámicas ({club}, {player}...)
// combinadas con condiciones y cadenas generan miles de variantes.
// ============================================================================
import type { GameState, Bindings, PendingEvent, PromiseItem, Player, Character, Coach, Club, SponsorCompany, IndKey, LedgerCat, Role, Urgency, CareerPos } from '../types';
import type { RNG } from '../rng';
import { rngOf } from '../rng';
import { absWeek, clamp, money, newId } from '../util';
import { userClub, squad, bestXI, positionOf, nextFixture, teamName, charsByRole, careerLevel } from '../queries';
import { book, institutionCash } from '../economy';
import { applyInd, changeInd, changeOpinion, snapshotInd } from '../relations';
import { addNews } from '../news';
import { DIFFICULTIES } from '../data/world';

export type Cat =
  | 'mercado' | 'finanzas' | 'resultados' | 'entrenadores' | 'jugadores' | 'patrocinadores' | 'socios' | 'hinchas' | 'seguridad'
  | 'elecciones' | 'politica' | 'asociacion' | 'confederacion' | 'fifa' | 'prensa' | 'escandalos' | 'infraestructura'
  | 'internacional' | 'selecciones' | 'personal' | 'crisis';

export const CAT_LABEL: Record<Cat, string> = {
  mercado: 'Mercado de pases', finanzas: 'Finanzas', resultados: 'Resultados deportivos', entrenadores: 'Entrenadores', jugadores: 'Jugadores', patrocinadores: 'Patrocinadores', socios: 'Socios', hinchas: 'Hinchas', seguridad: 'Seguridad',
  elecciones: 'Elecciones', politica: 'Política institucional', asociacion: 'Asociación nacional', confederacion: 'Confederación', fifa: 'FIF', prensa: 'Prensa', escandalos: 'Escándalos', infraestructura: 'Infraestructura',
  internacional: 'Relaciones internacionales', selecciones: 'Selecciones nacionales', personal: 'Situación personal', crisis: 'Crisis inesperada',
};

export interface Ctx {
  s: GameState;
  rng: RNG;
  b: Bindings;
  club?: Club;
  player?: Player;
  char?: Character;
  char2?: Character;
  coach?: Coach;
  other?: Club;
  company?: SponsorCompany;
  amount: number;
  amount2: number;
  abs: number;
  ind: GameState['ind'];
  pos: number; // posición en la tabla
  of: number;
  cash: number;
  lvl: number;
  sq: Player[];
}

export type PlayerSel = 'star' | 'any' | 'young' | 'veteran' | 'expiring' | 'injured' | 'flop' | 'scorer' | 'unhappy' | 'captain' | 'popular' | 'bench' | 'foreigner';
export type CharSel = Role | 'vocal' | ((c: Ctx) => Character | undefined);
export type OtherSel = 'rival' | 'arg_big' | 'arg_any' | 'foreign_rich' | 'foreign_sa' | 'derby' | 'lower' | 'next';
export type CompanySel = 'sponsor_current' | 'controversial' | 'clean' | 'any';

export interface Later { w: [number, number]; ev?: string; fx?: string; p?: number | ((c: Ctx) => number); params?: Record<string, any> }

export interface Fx {
  ind?: Partial<Record<IndKey, number>>;
  cash?: number | ((c: Ctx) => number);
  cat?: LedgerCat;
  wealth?: number | ((c: Ctx) => number);
  op?: Partial<Record<'char' | 'char2' | 'coach' | 'agent' | 'presidents' | 'assoc' | 'board' | 'barra' | 'journalists' | 'opposition' | 'vice' | 'other' | 'dd' | 'treasurer' | 'socios', number>>;
  mem?: string;
  morale?: number;
  pmorale?: number;
  flag?: Record<string, number | string | boolean>;
  later?: Later[];
  news?: string;
  tone?: 'pos' | 'neg' | 'neu';
  promise?: { key: string; text: string; weeks: number; weight?: number; target?: number };
  fn?: (c: Ctx) => string | void;
}

export interface Opt {
  label: string;
  detail?: string;
  fx: Fx;
  risk?: { p: number | ((c: Ctx) => number); fx: Fx; text: string };
  req?: (c: Ctx) => boolean;
  reqText?: string;
  out: string;
  auto?: boolean; // opción elegida al delegar / vencer el plazo
}

export interface EventDef {
  id: string;
  cat: Cat;
  title: string;
  text: string;
  pos?: (CareerPos | 'any')[];
  bind?: { player?: PlayerSel | ((c: Ctx) => Player | undefined); char?: CharSel; char2?: CharSel; coach?: 'own' | 'free_good' | 'former' | 'nt'; other?: OtherSel; company?: CompanySel; nation?: 'csf' | 'any' };
  amount?: (c: Ctx) => number;
  amount2?: (c: Ctx) => number;
  when?: (c: Ctx) => boolean;
  w?: number | ((c: Ctx) => number);
  urg?: Urgency;
  sev?: number;
  cd?: number;
  once?: boolean;
  chain?: boolean; // sólo aparece como consecuencia de otro acontecimiento
  ttl?: number;
  minLevel?: number;
  opts: Opt[];
}

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------
export const EVENTS: Record<string, EventDef> = {};
export function registerEvents(defs: EventDef[]) {
  for (const d of defs) {
    if (EVENTS[d.id]) throw new Error(`Evento duplicado: ${d.id}`);
    EVENTS[d.id] = d;
  }
}

export type LaterFn = (c: Ctx, params: Record<string, any>) => string | void;
export const LATER_FX: Record<string, LaterFn> = {};
export function registerLater(map: Record<string, LaterFn>) {
  Object.assign(LATER_FX, map);
}

export type PromiseCheck = (s: GameState, p: PromiseItem) => boolean;
export const PROMISE_CHECKS: Record<string, PromiseCheck> = {};
export function registerPromises(map: Record<string, PromiseCheck>) {
  Object.assign(PROMISE_CHECKS, map);
}

// ---------------------------------------------------------------------------
// Contexto y vínculos
// ---------------------------------------------------------------------------
export function baseCtx(s: GameState, rng: RNG, b: Bindings = {}): Ctx {
  const club = userClub(s) ?? undefined;
  const sq = club ? squad(s, club.id) : [];
  const { pos, of } = club ? positionOf(s, club.id) : { pos: 0, of: 0 };
  const c: Ctx = {
    s, rng, b, club, sq, pos, of,
    amount: b.amount ?? 0, amount2: b.amount2 ?? 0, abs: absWeek(s), ind: s.ind, cash: institutionCash(s), lvl: careerLevel(s),
  };
  hydrate(c);
  return c;
}

export function hydrate(c: Ctx) {
  const { s, b } = c;
  c.player = b.playerId ? s.players[b.playerId] : undefined;
  c.char = b.charId ? s.chars[b.charId] : undefined;
  c.char2 = b.char2Id ? s.chars[b.char2Id] : undefined;
  c.coach = b.coachId ? s.coaches[b.coachId] : undefined;
  c.other = b.clubId ? s.clubs[b.clubId] : undefined;
  c.company = b.sponsorId ? s.companies[b.sponsorId] : undefined;
  c.amount = b.amount ?? 0;
  c.amount2 = b.amount2 ?? 0;
}

function selectPlayer(c: Ctx, sel: PlayerSel): Player | undefined {
  const sq = c.sq.filter((p) => !p.loanFrom);
  if (!sq.length) return undefined;
  const xi = bestXI(sq);
  const avgXI = xi.reduce((a, p) => a + p.ovr, 0) / Math.max(1, xi.length);
  const by = (f: (p: Player) => boolean) => c.rng.pick(sq.filter(f).length ? sq.filter(f) : [undefined as unknown as Player]);
  switch (sel) {
    case 'star':
      return c.rng.pick([...sq].sort((a, b) => b.ovr - a.ovr).slice(0, 3));
    case 'any':
      return c.rng.pick(sq);
    case 'young':
      return by((p) => p.age <= 21 && p.pot >= p.ovr + 7);
    case 'veteran':
      return by((p) => p.age >= 31);
    case 'expiring':
      return by((p) => p.contractEnd <= c.s.season && p.ovr >= avgXI - 4);
    case 'injured':
      return by((p) => p.injury >= 3);
    case 'flop':
      return by((p) => !!p.signedFee && p.signedFee >= 300_000 && p.signedSeason !== undefined && c.s.season - p.signedSeason <= 1 && (p.ovr < avgXI || p.season.rating < 6.2) && p.season.apps >= 3);
    case 'scorer': {
      const t = [...sq].sort((a, b) => b.season.goals - a.season.goals)[0];
      return t && t.season.goals >= 3 ? t : undefined;
    }
    case 'unhappy':
      return by((p) => p.morale < 45);
    case 'captain':
      return [...xi].sort((a, b) => b.popularity + b.age - (a.popularity + a.age))[0];
    case 'popular':
      return by((p) => p.popularity >= 70);
    case 'bench':
      return by((p) => !xi.includes(p) && p.age >= 22);
    case 'foreigner':
      return by((p) => p.nat !== 'ARG');
  }
}

const STAFF_ROLES: Role[] = ['vicepresidente', 'tesorero', 'director_deportivo', 'lider_barra', 'lider_socios', 'opositor'];

function selectChar(c: Ctx, sel: CharSel, exclude?: string): Character | undefined {
  if (typeof sel === 'function') return sel(c);
  const s = c.s;
  if (sel === 'vocal') {
    const ids = c.club?.staff?.vocales ?? [];
    return c.rng.pick(ids.map((i) => s.chars[i]).filter((x) => x && x.active && x.id !== exclude));
  }
  if (STAFF_ROLES.includes(sel)) {
    const id = c.club?.staff?.[sel as 'vicepresidente'];
    const ch = id ? s.chars[id] : undefined;
    return ch && ch.active ? ch : undefined;
  }
  if (sel === 'presidente_asociacion') return s.assoc.presidentId ? s.chars[s.assoc.presidentId] : undefined;
  if (sel === 'presidente_club') return c.rng.pick(charsByRole(s, 'presidente_club').filter((x) => x.clubId !== c.club?.id && x.id !== exclude && s.clubs[x.clubId!]?.division === (c.club?.division ?? 1)) || []) ?? c.rng.pick(charsByRole(s, 'presidente_club'));
  const pool = charsByRole(s, sel).filter((x) => x.id !== exclude);
  return pool.length ? c.rng.pick(pool) : undefined;
}

function selectOther(c: Ctx, sel: OtherSel): Club | undefined {
  const s = c.s;
  const all = Object.values(s.clubs).filter((x) => x.id !== c.club?.id);
  switch (sel) {
    case 'rival':
      return c.rng.pick(all.filter((x) => x.country === 'ARG' && x.division === (c.club?.division ?? 1)));
    case 'arg_big':
      return c.rng.pick(all.filter((x) => x.country === 'ARG' && x.division === 1 && x.prestige >= Math.max(70, (c.club?.prestige ?? 50) + 5)));
    case 'arg_any':
      return c.rng.pick(all.filter((x) => x.country === 'ARG'));
    case 'foreign_rich':
      return c.rng.pick(all.filter((x) => x.division === 0 && ['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'KSA', 'POR', 'MEX', 'USA'].includes(x.country)));
    case 'foreign_sa':
      return c.rng.pick(all.filter((x) => x.division === 0 && ['BRA', 'URU', 'CHI', 'COL', 'MEX'].includes(x.country)));
    case 'derby':
      return c.club?.rivalId ? s.clubs[c.club.rivalId] : undefined;
    case 'lower':
      return c.rng.pick(all.filter((x) => x.country === 'ARG' && x.division > (c.club?.division ?? 1)));
    case 'next': {
      if (!c.club) return undefined;
      const f = nextFixture(s, c.club.id);
      if (!f) return undefined;
      return s.clubs[f.home === c.club.id ? f.away : f.home];
    }
  }
}

function selectCompany(c: Ctx, sel: CompanySel): SponsorCompany | undefined {
  const s = c.s;
  const all = Object.values(s.companies);
  if (sel === 'sponsor_current') return c.rng.pick(s.sponsors.map((x) => s.companies[x.companyId]).filter(Boolean));
  if (sel === 'controversial') return c.rng.pick(all.filter((x) => x.controversy >= 45));
  if (sel === 'clean') return c.rng.pick(all.filter((x) => x.controversy < 30));
  return c.rng.pick(all);
}

/** Intenta vincular entidades a un acontecimiento. Devuelve null si no se puede. */
export function bindEvent(def: EventDef, c: Ctx): Bindings | null {
  const b: Bindings = {};
  const spec = def.bind ?? {};
  if (spec.player) {
    const p = typeof spec.player === 'function' ? spec.player(c) : selectPlayer(c, spec.player);
    if (!p) return null;
    b.playerId = p.id;
    if (p.agentId) b.agentId = p.agentId;
  }
  if (spec.char) {
    const ch = selectChar(c, spec.char);
    if (!ch) return null;
    b.charId = ch.id;
  }
  if (spec.char2) {
    const ch = selectChar(c, spec.char2, b.charId);
    if (!ch) return null;
    b.char2Id = ch.id;
  }
  if (spec.coach) {
    let co: Coach | undefined;
    if (spec.coach === 'own') co = c.club?.coachId ? c.s.coaches[c.club.coachId] : undefined;
    else if (spec.coach === 'nt') co = c.s.nt.coachId ? c.s.coaches[c.s.nt.coachId] : undefined;
    else if (spec.coach === 'free_good') co = c.rng.pick(Object.values(c.s.coaches).filter((x) => !x.clubId && !x.nationalTeam && x.ability >= 65 && x.age < 75));
    else co = c.rng.pick(Object.values(c.s.coaches).filter((x) => x.memory.length > 0 && x.id !== c.club?.coachId));
    if (!co) return null;
    b.coachId = co.id;
  }
  if (spec.other) {
    const o = selectOther(c, spec.other);
    if (!o) return null;
    b.clubId = o.id;
  }
  if (spec.company) {
    const co = selectCompany(c, spec.company);
    if (!co) return null;
    b.sponsorId = co.id;
  }
  if (spec.nation) {
    const ns = Object.values(c.s.nations).filter((n) => n.code !== 'ARG' && (spec.nation === 'any' || n.confed === 'CSF'));
    b.nation = c.rng.pick(ns).code;
  }
  c.b = b;
  hydrate(c);
  try {
    if (def.amount) b.amount = Math.max(0, Math.round(def.amount(c) / 1000) * 1000);
    if (def.amount2) b.amount2 = Math.max(0, Math.round(def.amount2(c) / 1000) * 1000);
  } catch {
    return null;
  }
  if (!Number.isFinite(b.amount ?? 0) || !Number.isFinite(b.amount2 ?? 0)) return null;
  hydrate(c);
  return b;
}

const POS_NAME = { POR: 'arquero', DEF: 'defensor', MED: 'mediocampista', DEL: 'delantero' } as const;

export function render(t: string, c: Ctx): string {
  const s = c.s;
  const nf = c.club ? nextFixture(s, c.club.id) : undefined;
  const nextName = nf && c.club ? teamName(s, nf.home === c.club.id ? nf.away : nf.home) : 'el próximo rival';
  const agent = c.player?.agentId ? s.chars[c.player.agentId] : undefined;
  const assocPres = s.assoc.presidentId ? s.chars[s.assoc.presidentId] : undefined;
  const derby = c.club?.rivalId ? s.clubs[c.club.rivalId] : undefined;
  const vars: Record<string, string> = {
    club: c.club?.name ?? 'la institución',
    clubshort: c.club?.short ?? '',
    city: c.club?.city ?? '',
    stadium: c.club?.stadium.name ?? 'el estadio',
    player: c.player?.name ?? 'el jugador',
    pos: c.player ? POS_NAME[c.player.pos] : '',
    age: String(c.player?.age ?? ''),
    char: c.char?.name ?? 'un dirigente',
    chartitle: c.char?.title ?? '',
    char2: c.char2?.name ?? 'otro dirigente',
    char2title: c.char2?.title ?? '',
    coach: c.coach?.name ?? 'el entrenador',
    other: c.other?.name ?? 'otro club',
    othercountry: c.other ? countryName(c.other.country) : '',
    company: c.company?.name ?? 'una empresa',
    sector: c.company?.sector ?? '',
    amount: money(c.amount),
    amount2: money(c.amount2),
    n: String(c.b.n ?? ''),
    president: `${s.president.name} ${s.president.surname}`,
    surname: s.president.surname,
    season: String(s.season),
    division: c.club ? divisionName(c.club.division) : '',
    position: c.pos ? `${c.pos}º` : '-',
    derby: derby?.name ?? 'el clásico rival',
    nation: c.b.nation ? s.nations[c.b.nation]?.name ?? '' : '',
    assoc: s.assoc.short,
    assocpres: assocPres?.name ?? 'el presidente de la asociación',
    agent: agent?.name ?? 'su representante',
    next: nextName,
    confed: s.confed.short,
    fifa: s.fifa.short,
  };
  return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function divisionName(d: number) {
  return d === 1 ? 'Liga Profesional' : d === 2 ? 'Primera Nacional' : d === 3 ? 'Torneo Federal' : 'Exterior';
}
const COUNTRY: Record<string, string> = { ARG: 'Argentina', BRA: 'Brasil', URU: 'Uruguay', CHI: 'Chile', COL: 'Colombia', MEX: 'México', USA: 'Estados Unidos', ESP: 'España', ENG: 'Inglaterra', ITA: 'Italia', GER: 'Alemania', FRA: 'Francia', POR: 'Portugal', KSA: 'Arabia Saudita' };
export function countryName(cc: string) {
  return COUNTRY[cc] ?? cc;
}

// ---------------------------------------------------------------------------
// Generación semanal
// ---------------------------------------------------------------------------
function posAllowed(def: EventDef, s: GameState) {
  const allowed = def.pos ?? ['club'];
  return allowed.includes('any') || allowed.includes(s.president.pos);
}

function ttlFor(u: Urgency, def: EventDef) {
  return def.ttl ?? (u === 'urgente' ? 1 : u === 'importante' ? 3 : 2);
}

export function createPending(s: GameState, def: EventDef, c: Ctx): PendingEvent {
  const urgency = def.urg ?? 'importante';
  const pe: PendingEvent = {
    uid: newId(s, 'e'),
    defId: def.id,
    createdAbs: c.abs,
    expiresAbs: c.abs + ttlFor(urgency, def),
    b: c.b,
    urgency,
    severity: def.sev ?? 2,
    title: render(def.title, c),
    text: render(def.text, c),
  };
  s.inbox.push(pe);
  s.cooldowns[def.id] = c.abs + (def.cd ?? 30);
  s.eventCounts[def.id] = (s.eventCounts[def.id] ?? 0) + 1;
  return pe;
}

export function eligibleEvents(s: GameState, rng: RNG): { def: EventDef; c: Ctx; w: number }[] {
  const abs = absWeek(s);
  const out: { def: EventDef; c: Ctx; w: number }[] = [];
  const base = baseCtx(s, rng);
  for (const def of Object.values(EVENTS)) {
    if (def.chain) continue;
    if (!posAllowed(def, s)) continue;
    if ((s.cooldowns[def.id] ?? -1) > abs) continue;
    if (def.once && s.eventCounts[def.id]) continue;
    if (def.minLevel && base.lvl < def.minLevel) continue;
    if (s.inbox.some((e) => e.defId === def.id)) continue;
    const c: Ctx = { ...base, b: {} };
    const b = bindEvent(def, c);
    if (!b) continue;
    try {
      if (def.when && !def.when(c)) continue;
    } catch {
      continue;
    }
    let w = typeof def.w === 'function' ? def.w(c) : def.w ?? 1;
    if (s.settings.mode === 'rapido' && (def.sev ?? 2) <= 2) w *= 0.35;
    if (s.settings.mode === 'detallado' && (def.sev ?? 2) <= 2) w *= 1.4;
    if (w > 0) out.push({ def, c, w });
  }
  return out;
}

export function generateWeeklyEvents(s: GameState, rng: RNG): string[] {
  if (s.president.pos === 'retirado') return [];
  const created: string[] = [];
  const rate = (s.settings.mode === 'rapido' ? 0.6 : s.settings.mode === 'normal' ? 1.0 : 1.5) * DIFFICULTIES[s.settings.difficulty].events;
  const pendingCount = s.inbox.length;
  if (pendingCount >= 7) return created;
  let n = rng.poisson(rate);
  if (s.week <= 1) n = Math.max(n, 1);
  n = Math.min(n, 3, 7 - pendingCount);
  if (n <= 0) return created;
  const pool = eligibleEvents(s, rng);
  const usedCats = new Set<string>();
  for (let i = 0; i < n && pool.length; i++) {
    const pick = rng.weighted(pool.filter((x) => !usedCats.has(x.def.cat)), (x) => x.w);
    if (!pick) break;
    usedCats.add(pick.def.cat);
    pool.splice(pool.indexOf(pick), 1);
    const pe = createPending(s, pick.def, pick.c);
    created.push(pe.uid);
  }
  autoDelegate(s, rng);
  return created;
}

/** Delegación de acontecimientos menores al vicepresidente, tesorero o director deportivo. */
export function autoDelegate(s: GameState, rng: RNG) {
  const d = s.settings.delegate;
  for (const e of [...s.inbox]) {
    const def = EVENTS[e.defId];
    if (!def || e.urgency === 'urgente') continue;
    const minor = (def.sev ?? 2) <= 2;
    if ((d.mercado && def.cat === 'mercado' && minor) || (d.finanzasMenores && def.cat === 'finanzas' && minor) || (d.prensa && def.cat === 'prensa' && minor)) {
      const idx = Math.max(0, def.opts.findIndex((o) => o.auto));
      resolveEvent(s, e.uid, idx, true, rng);
    }
  }
}

// ---------------------------------------------------------------------------
// Resolución
// ---------------------------------------------------------------------------
export interface ResolveResult { title: string; choice: string; outcome: string; deltas: Partial<Record<IndKey, number>>; cash: number; wealth: number; hiddenRisk: boolean }

export function optionAvailable(c: Ctx, o: Opt): boolean {
  try {
    return !o.req || o.req(c);
  } catch {
    return false;
  }
}

export function applyFx(c: Ctx, fx: Fx): string[] {
  const s = c.s;
  const extra: string[] = [];
  if (fx.ind) applyInd(s, fx.ind);
  if (fx.cash !== undefined) {
    const v = typeof fx.cash === 'function' ? fx.cash(c) : fx.cash;
    book(s, fx.cat ?? (v >= 0 ? 'aportes' : 'otros'), v);
  }
  if (fx.wealth !== undefined) {
    const v = typeof fx.wealth === 'function' ? fx.wealth(c) : fx.wealth;
    s.president.wealth = Math.round(s.president.wealth + v);
  }
  if (fx.op) {
    const memo = fx.mem ? render(fx.mem, c) : undefined;
    const o = fx.op;
    if (o.char) changeOpinion(s, c.char?.id, o.char, memo);
    if (o.char2) changeOpinion(s, c.char2?.id, o.char2, memo);
    if (o.coach) changeOpinion(s, c.coach?.id ?? c.club?.coachId, o.coach, memo);
    if (o.agent) changeOpinion(s, c.b.agentId ?? c.player?.agentId, o.agent, memo);
    if (o.other) changeOpinion(s, c.other?.presidentId, o.other, memo);
    if (o.assoc) changeOpinion(s, s.assoc.presidentId, o.assoc, memo);
    if (o.vice) changeOpinion(s, c.club?.staff?.vicepresidente, o.vice, memo);
    if (o.treasurer) changeOpinion(s, c.club?.staff?.tesorero, o.treasurer, memo);
    if (o.dd) changeOpinion(s, c.club?.staff?.director_deportivo, o.dd, memo);
    if (o.barra) changeOpinion(s, c.club?.staff?.lider_barra, o.barra, memo);
    if (o.opposition) changeOpinion(s, c.club?.staff?.opositor, o.opposition, memo);
    if (o.socios) changeOpinion(s, c.club?.staff?.lider_socios, o.socios, memo);
    if (o.board) for (const id of [c.club?.staff?.vicepresidente, c.club?.staff?.tesorero, ...(c.club?.staff?.vocales ?? [])]) changeOpinion(s, id, o.board, memo);
    if (o.presidents) for (const p of charsByRole(s, 'presidente_club')) changeOpinion(s, p.id, o.presidents * (0.6 + c.rng.next() * 0.8));
    if (o.journalists) for (const p of charsByRole(s, 'periodista')) changeOpinion(s, p.id, o.journalists * (0.6 + c.rng.next() * 0.8));
  } else if (fx.mem) {
    // memoria sin cambio de opinión: queda registrada en el personaje principal
    const t = c.char ?? c.coach;
    if (t) t.memory.push({ s: s.season, w: s.week, t: render(fx.mem, c), d: 0 });
  }
  if (fx.morale && c.club) for (const p of squad(s, c.club.id)) p.morale = clamp(p.morale + fx.morale);
  if (fx.pmorale && c.player) c.player.morale = clamp(c.player.morale + fx.pmorale);
  if (fx.flag) for (const [k, v] of Object.entries(fx.flag)) s.flags[k] = v;
  if (fx.later) for (const l of fx.later) schedule(c, l);
  if (fx.news) addNews(s, render(fx.news, c), fx.tone ?? 'neu', undefined, true);
  if (fx.promise) {
    s.promises.push({ id: newId(s, 'pr'), text: render(fx.promise.text, c), key: fx.promise.key, deadlineAbs: c.abs + fx.promise.weeks, madeAbs: c.abs, to: c.char?.id ?? null, target: fx.promise.target, kept: null, weight: fx.promise.weight ?? 1 });
  }
  if (fx.fn) {
    const r = fx.fn(c);
    if (r) extra.push(r);
  }
  return extra;
}

export function schedule(c: Ctx, l: Later) {
  const at = c.abs + c.rng.int(l.w[0], l.w[1]);
  const p = typeof l.p === 'function' ? l.p(c) : l.p;
  c.s.scheduled.push({ at, kind: l.ev ? 'event' : 'effect', id: (l.ev ?? l.fx)!, b: { ...c.b }, p, params: l.params });
}

export function resolveEvent(s: GameState, uid: string, optIndex: number, auto = false, rngIn?: RNG): ResolveResult | null {
  const pe = s.inbox.find((e) => e.uid === uid);
  if (!pe) return null;
  const def = EVENTS[pe.defId];
  s.inbox = s.inbox.filter((e) => e.uid !== uid);
  if (!def) return null;
  const rng = rngIn ?? rngOf(s);
  const c = baseCtx(s, rng, pe.b);
  let idx = optIndex;
  if (!def.opts[idx] || !optionAvailable(c, def.opts[idx])) idx = def.opts.findIndex((o) => optionAvailable(c, o));
  const opt = def.opts[Math.max(0, idx)];
  const before = snapshotInd(s);
  const cashBefore = institutionCash(s);
  const wealthBefore = s.president.wealth;
  const extra = applyFx(c, opt.fx);
  let hiddenRisk = false;
  if (opt.risk) {
    const p = typeof opt.risk.p === 'function' ? opt.risk.p(c) : opt.risk.p;
    if (rng.chance(p)) {
      hiddenRisk = true;
      extra.push(render(opt.risk.text, c));
      extra.push(...applyFx(c, opt.risk.fx));
    }
  }
  const deltas: Partial<Record<IndKey, number>> = {};
  for (const k of Object.keys(before) as IndKey[]) {
    const d = Math.round((s.ind[k] - before[k]) * 10) / 10;
    if (Math.abs(d) >= 0.5) deltas[k] = d;
  }
  const outcome = [render(opt.out, c), ...extra].filter(Boolean).join(' ');
  const res: ResolveResult = { title: pe.title, choice: render(opt.label, c), outcome, deltas, cash: institutionCash(s) - cashBefore, wealth: s.president.wealth - wealthBefore, hiddenRisk };
  s.resolved.unshift({ defId: def.id, uid, title: pe.title, season: s.season, week: s.week, choice: res.choice, outcome, auto, cat: def.cat });
  if (s.resolved.length > 400) s.resolved.length = 400;
  return res;
}

/** Vencimientos: lo no resuelto se resuelve solo (con la opción conservadora). */
export function expireEvents(s: GameState, rng: RNG): string[] {
  const abs = absWeek(s);
  const out: string[] = [];
  for (const e of [...s.inbox]) {
    if (e.expiresAbs <= abs && e.urgency !== 'urgente') {
      const def = EVENTS[e.defId];
      const idx = def ? Math.max(0, def.opts.findIndex((o) => o.auto)) : 0;
      const r = resolveEvent(s, e.uid, idx, true, rng);
      if (r) out.push(`Venció el plazo de "${r.title}": se resolvió "${r.choice}".`);
    }
  }
  return out;
}

export function delegateUrgent(s: GameState, rng: RNG): string[] {
  const out: string[] = [];
  for (const e of [...s.inbox].filter((x) => x.urgency === 'urgente')) {
    const def = EVENTS[e.defId];
    const idx = def ? Math.max(0, def.opts.findIndex((o) => o.auto)) : 0;
    const r = resolveEvent(s, e.uid, idx, true, rng);
    if (r) out.push(`Delegado: "${r.title}" → ${r.choice}.`);
  }
  changeInd(s, 'gobernabilidad', -0.5 * out.length);
  return out;
}

/** Consecuencias programadas (cadenas narrativas y efectos diferidos). */
export function processScheduled(s: GameState, rng: RNG): string[] {
  const abs = absWeek(s);
  const due = s.scheduled.filter((x) => x.at <= abs);
  s.scheduled = s.scheduled.filter((x) => x.at > abs);
  const notes: string[] = [];
  for (const sc of due) {
    if (sc.p !== undefined && !rng.chance(sc.p)) continue;
    const c = baseCtx(s, rng, sc.b);
    if (sc.kind === 'event') {
      const def = EVENTS[sc.id];
      if (!def || !posAllowed(def, s)) continue;
      // validar que las entidades vinculadas sigan existiendo
      if (sc.b.playerId && (!s.players[sc.b.playerId] || s.players[sc.b.playerId].retired)) continue;
      if (def.when && def.chain) {
        try {
          if (!def.when(c)) continue;
        } catch {
          continue;
        }
      }
      if (def.amount) sc.b.amount = Math.round(def.amount(c) / 1000) * 1000;
      c.b = sc.b;
      hydrate(c);
      createPending(s, def, c);
    } else {
      const fn = LATER_FX[sc.id];
      if (!fn) continue;
      const r = fn(c, sc.params ?? {});
      if (r) notes.push(r);
    }
  }
  return notes;
}

/** Promesas: se evalúan al vencer. */
export function checkPromises(s: GameState): string[] {
  const abs = absWeek(s);
  const notes: string[] = [];
  for (const p of s.promises) {
    if (p.kept !== null && p.kept !== undefined) continue;
    if (p.deadlineAbs > abs) continue;
    const check = PROMISE_CHECKS[p.key];
    const kept = check ? check(s, p) : true;
    p.kept = kept;
    if (kept) {
      changeInd(s, 'socios', 3 * p.weight);
      changeInd(s, 'integridad', 1.5 * p.weight);
      if (p.to) changeOpinion(s, p.to, 12, `Cumpliste tu promesa: ${p.text}`);
      addNews(s, `Promesa cumplida: ${p.text}`, 'pos', 'promesas', true);
      notes.push(`Cumpliste una promesa: ${p.text}.`);
    } else {
      changeInd(s, 'socios', -5 * p.weight);
      changeInd(s, 'integridad', -3 * p.weight);
      changeInd(s, 'periodistas', -2);
      if (p.to) changeOpinion(s, p.to, -20, `Promesa incumplida: ${p.text}`);
      addNews(s, `Promesa incumplida: ${p.text}`, 'neg', 'promesas', true);
      s.flags.brokenPromises = Number(s.flags.brokenPromises ?? 0) + 1;
      notes.push(`Incumpliste una promesa: ${p.text}.`);
    }
  }
  return notes;
}

/** Disparo inmediato de un acontecimiento concreto (para acciones del jugador y pruebas). */
export function triggerEvent(s: GameState, rng: RNG, id: string, b: Bindings = {}): PendingEvent | null {
  const def = EVENTS[id];
  if (!def) return null;
  const c = baseCtx(s, rng, b);
  if (!Object.keys(b).length) {
    const nb = bindEvent(def, c);
    if (!nb) return null;
  }
  return createPending(s, def, c);
}

// Utilidades de escala económica para los textos de los acontecimientos
export function scaleMoney(c: Ctx, base: number): number {
  const club = c.club;
  if (!club) return base * 10;
  const f = club.division === 1 ? 0.4 + Math.pow(club.prestige / 100, 2.2) * 2.4 : club.division === 2 ? 0.25 : 0.08;
  return Math.round((base * f) / 1000) * 1000;
}

export const pick = <T,>(c: Ctx, arr: readonly T[]) => c.rng.pick(arr);
