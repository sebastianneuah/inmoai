// ============================================================================
// Orquestador del juego: nueva partida, avance semanal, simulación hasta el
// próximo partido/acontecimiento y cierre de temporada.
// ============================================================================
import type { GameState, WeekReport, PersonalityId, Difficulty, GameMode, Fixture, Indicators } from './types';
import { IND_KEYS, WEEKS_PER_SEASON } from './types';
import { rngOf, mulberry } from './rng';
import { absWeek, clamp, money } from './util';
import { generateWorld, ensureClubStaff } from './worldgen';
import { setupSeasonCompetitions, setupClubWorldCup, recordResult, progressCompetitions, koWinner } from './competitions';
import { simulateFixture } from './match';
import { book, weeklyClubFinance, weeklyBodyFinance, weeklyAIFinance, addPrize } from './economy';
import { weeklyIndicators } from './relations';
import { aiTransfers, fillSquads, delegatedMarket } from './market';
import { aiCoachChanges } from './coaches';
import { weeklySponsors, generateSponsorOffers, initialSponsors } from './sponsors';
import { weeklyCapital, seasonPolitics, weeklyElection, weeklyAssembly, leaveClub } from './politics';
import { endSeason, startNewSeason, generateObjectives } from './season';
import { addNews, resultHeadline } from './news';
import { ntTournamentOutcome } from './nationalteam';
import { userClub, teamName, careerLevel } from './queries';
import { PERSONALITIES, DIFFICULTIES } from './data/world';
import { estimateRevenue } from './valuation';
import { generateWeeklyEvents, expireEvents, processScheduled, checkPromises, EVENTS } from './events';

export const SAVE_VERSION = 1;

export interface NewGameConfig {
  name: string;
  surname: string;
  nationality: string;
  age: number;
  country: string;
  clubId: string;
  difficulty: Difficulty;
  personality: PersonalityId;
  mandateYears: number;
  mode: GameMode;
  seed?: number;
}

export function createWorldPreview(seed: number): GameState {
  const s = blankState(seed, 'preview');
  const rng = rngOf(s);
  generateWorld(s, rng);
  return s;
}

function blankState(seed: number, id: string): GameState {
  const ind = {} as Indicators;
  for (const k of IND_KEYS) ind[k] = 50;
  ind.riesgo = 15;
  ind.influencia = 25;
  ind.repInternacional = 20;
  ind.repNacional = 35;
  return {
    v: SAVE_VERSION, id, name: '', seed, rng: seed, createdAt: Date.now(), updatedAt: Date.now(), startSeason: 2027, season: 2027, week: 1,
    settings: { difficulty: 'normal', mode: 'normal', liveMatches: true, liveSpeed: 1, delegate: { mercado: false, finanzasMenores: false, prensa: false } },
    president: { name: '', surname: '', nationality: 'ARG', age: 45, personality: 'empresario', wealth: 0, pos: 'club', clubId: null, mandateStart: 2027, mandateEnd: 2029, mandateYears: 3, health: 100, committee: false, politicalCapital: 3, lastActionAbs: {} },
    ind, indHistory: [], clubs: {}, players: {}, coaches: {}, chars: {}, companies: {}, nations: {}, comps: {}, fixtures: [],
    ledger: {}, ledgerHistory: [], cashHistory: [], loans: [], sponsors: [], sponsorOffers: [],
    economy: { ticketMult: 1, feeMult: 1, transferBudget: 0, wageCap: 0, emergency: false, emergencyAbs: null, securityLevel: 1, budgetApproved: null, staffCost: 1 },
    projects: [], inbox: [], resolved: [], cooldowns: {}, eventCounts: {}, scheduled: [], promises: [], flags: {}, news: [], offers: [], election: null,
    assoc: {} as GameState['assoc'], confed: {} as GameState['confed'], fifa: {} as GameState['fifa'], nt: {} as GameState['nt'],
    career: { clubs: [], positions: [], titles: [], promotions: 0, relegations: 0, electionsWon: 0, electionsLost: 0, moneyGenerated: 0, works: [], signings: [], crises: 0, sanctions: [], milestones: [], peakLevel: 1 },
    objectives: [], seasons: [], lastReport: null, gameOver: null, uid: 0,
  };
}

export function newGame(cfg: NewGameConfig): GameState {
  const seed = cfg.seed ?? Math.floor(Math.random() * 2 ** 31);
  const s = blankState(seed, `g${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`);
  const rng = rngOf(s);
  generateWorld(s, rng);
  const club = s.clubs[cfg.clubId] ?? Object.values(s.clubs).find((c) => c.division === 2)!;
  const pers = PERSONALITIES.find((p) => p.id === cfg.personality)!;
  const diff = DIFFICULTIES[cfg.difficulty];
  s.name = `${cfg.name} ${cfg.surname} — ${club.name}`;
  s.settings.difficulty = cfg.difficulty;
  s.settings.mode = cfg.mode;
  s.president = { ...s.president, name: cfg.name, surname: cfg.surname, nationality: cfg.nationality, age: cfg.age, personality: cfg.personality, wealth: pers.wealth, pos: 'club', clubId: club.id, mandateStart: s.season, mandateYears: cfg.mandateYears, mandateEnd: s.season + cfg.mandateYears - 1, politicalCapital: 3 };
  // el club del usuario deja de tener presidente NPC
  const prev = club.presidentId ? s.chars[club.presidentId] : null;
  if (prev) {
    prev.active = false;
    prev.tags.push('ex_presidente');
    s.assoc.committee = s.assoc.committee.filter((id) => id !== prev.id);
  }
  club.presidentId = null;
  club.nextElection = s.president.mandateEnd;
  ensureClubStaff(s, rng, club);
  // economía inicial según dificultad y personalidad
  club.fin.cash = Math.round(club.fin.cash * diff.cash + pers.clubCashBonus * (club.division === 1 ? 1 : 0.4));
  if (cfg.difficulty === 'leyenda') club.fin.debt += Math.round(estimateRevenue(s, club) * 0.3);
  if (club.fin.debt > 0) {
    s.loans.push({ id: 'ln_her', lender: 'Deuda heredada', principal: club.fin.debt, balance: club.fin.debt, rate: 0.12, weeksLeft: 120, payment: (club.fin.debt * 1.25) / 120, takenSeason: s.season });
    club.fin.debt = 0;
  }
  s.economy.transferBudget = Math.max(0, Math.round(club.fin.cash * 0.4));
  // indicadores iniciales
  for (const [k, v] of Object.entries(pers.ind)) s.ind[k as keyof Indicators] = v as number;
  s.ind.prestigio = clamp(Math.round(club.prestige * 0.8));
  s.ind.repNacional = clamp(Math.round(30 + club.prestige * 0.2 + (pers.ind.repNacional ?? 0) * 0));
  s.ind.patrocinadores = pers.ind.patrocinadores ?? 50;
  if (pers.perks.includes('players_plus')) for (const ch of Object.values(s.chars).filter((x) => x.role === 'representante')) ch.opinion += 10;
  if (pers.perks.includes('politics_plus')) for (const ch of Object.values(s.chars).filter((x) => x.role === 'presidente_club' || x.role === 'dirigente_asociacion')) ch.opinion += 12;
  if (pers.perks.includes('market_plus')) for (const ch of Object.values(s.chars).filter((x) => x.role === 'representante')) ch.opinion += 20;
  if (pers.perks.includes('fans_plus')) { const b = club.staff?.lider_socios; if (b) s.chars[b].opinion += 25; }
  s.career.clubs.push({ clubId: club.id, name: club.name, from: s.season, to: null });
  s.career.positions.push({ pos: 'club', label: `Presidente de ${club.name}`, from: s.season, to: null });
  s.career.peakLevel = Math.max(1, careerLevel(s));
  setupSeasonCompetitions(s, rng);
  s.objectives = generateObjectives(s);
  initialSponsors(s, rng);
  generateSponsorOffers(s, rng, 2);
  addNews(s, `${cfg.name} ${cfg.surname} asume la presidencia de ${club.name}`, 'pos', 'carrera', true, `"${pers.desc}" Mandato hasta ${s.president.mandateEnd}.`);
  addNews(s, `La AAF presenta el calendario de la temporada ${s.season}`, 'neu', 'temporada');
  // primeros acontecimientos de bienvenida
  generateWeeklyEvents(s, rng);
  return s;
}

export function blockingReason(s: GameState): string | null {
  if (s.gameOver) return 'La carrera terminó.';
  if (s.inbox.some((e) => e.urgency === 'urgente')) return 'Tenés decisiones urgentes pendientes.';
  return null;
}

/** Juega todos los partidos de la semana actual. */
function playWeekFixtures(s: GameState, report: WeekReport) {
  const rng = rngOf(s);
  const week = s.week;
  const uc = userClub(s);
  const mine = new Set([s.president.clubId ?? '', s.president.pos === 'asociacion' ? 'ARG' : '__']);
  const fixtures = s.fixtures.filter((f) => f.week === week && !f.played);
  for (const f of fixtures) {
    const isUser = mine.has(f.home) || mine.has(f.away);
    simulateFixture(s, rng, f, { detail: isUser, isUser });
    recordResult(s, f);
    if (isUser) report.userFixtures.push(f.id);
    if (uc && (f.home === uc.id || f.away === uc.id) && s.president.pos === 'club') userMatchConsequences(s, f, report);
    if ((f.home === 'ARG' || f.away === 'ARG') && !isUser) {
      const gf = f.home === 'ARG' ? f.hg! : f.ag!;
      const ga = f.home === 'ARG' ? f.ag! : f.hg!;
      addNews(s, `${s.comps[f.comp]?.short ?? ''}: Argentina ${gf}-${ga} ${teamName(s, f.home === 'ARG' ? f.away : f.home)}`, gf > ga ? 'pos' : gf < ga ? 'neg' : 'neu', 'seleccion');
    }
    if (f.national && (f.home === 'ARG' || f.away === 'ARG')) {
      const won = (f.home === 'ARG' && f.hg! > f.ag!) || (f.away === 'ARG' && f.ag! > f.hg!);
      s.nt.morale = clamp(s.nt.morale + (won ? 3 : -2));
      if (s.president.pos === 'asociacion') {
        book(s, 'entradas', f.home === 'ARG' ? 2_500_000 : 0);
        if (s.nt.bonus && won) book(s, 'premios', -s.nt.bonus * 150_000);
      }
    }
  }
  if (s.flags.premioPartido && fixtures.some((f) => uc && (f.home === uc.id || f.away === uc.id))) s.flags.premioPartido = 0;
  // fases de copas
  const before: Record<string, string[]> = {};
  for (const c of Object.values(s.comps)) before[c.id] = [...c.koAlive];
  const prog = progressCompetitions(s, rng, week);
  for (const { comp, finished } of prog) {
    if (finished && comp.winner) {
      const wName = teamName(s, comp.winner);
      addNews(s, `${wName} campeón de la ${comp.name} ${s.season}`, comp.winner === s.president.clubId ? 'pos' : 'neu', 'titulos', comp.winner === s.president.clubId);
      if (comp.scope === 'club') {
        const wc = s.clubs[comp.winner];
        if (wc) wc.titles.push({ season: s.season, comp: comp.name });
        addPrize(s, comp.winner, comp.prizeWin, comp.name);
        if (comp.runnerUp) addPrize(s, comp.runnerUp, Math.round(comp.prizeWin * 0.4), comp.name);
        if (comp.winner === s.president.clubId && s.president.pos === 'club') userTitle(s, comp.name, report);
      }
    }
  }
  // selección: eliminaciones y títulos
  for (const comp of Object.values(s.comps)) {
    if (comp.scope !== 'national' || comp.type === 'league') continue;
    const wasAlive = before[comp.id]?.includes('ARG');
    const groupsJustEnded = comp.stage === 'ko' && comp.koIndex === 0 && comp.participants.includes('ARG') && !comp.koAlive.includes('ARG') && !s.flags[`ntOut_${comp.id}`] && comp.koAlive.length > 0 && (before[comp.id]?.length ?? 0) === 0;
    if (groupsJustEnded) {
      s.flags[`ntOut_${comp.id}`] = true;
      ntTournamentOutcome(s, comp.name, 'la fase de grupos', false);
    } else if (wasAlive && !comp.koAlive.includes('ARG') && !s.flags[`ntOut_${comp.id}`]) {
      s.flags[`ntOut_${comp.id}`] = true;
      ntTournamentOutcome(s, comp.name, comp.koWeeks[Math.max(0, comp.koIndex - 1)]?.name ?? 'eliminatorias', false);
    } else if (comp.stage === 'done' && comp.winner === 'ARG' && !s.flags[`ntWin_${comp.id}`]) {
      s.flags[`ntWin_${comp.id}`] = true;
      ntTournamentOutcome(s, comp.name, 'final', true);
    } else if (comp.stage === 'done' && comp.runnerUp === 'ARG' && !s.flags[`ntOut_${comp.id}`]) {
      s.flags[`ntOut_${comp.id}`] = true;
      ntTournamentOutcome(s, comp.name, 'la final', false);
    }
  }
}

function userTitle(s: GameState, comp: string, report: WeekReport) {
  const c = userClub(s)!;
  s.flags[`titleWon_${s.season}`] = true;
  s.career.titles.push({ season: s.season, comp, club: c.name });
  s.career.milestones.push({ season: s.season, week: s.week, text: `¡Campeón de la ${comp} con ${c.name}!` });
  const ind = s.ind;
  ind.socios = clamp(ind.socios + 12);
  ind.hinchas = clamp(ind.hinchas + 15);
  ind.repNacional = clamp(ind.repNacional + 8);
  ind.prestigio = clamp(ind.prestigio + 10);
  ind.comision = clamp(ind.comision + 8);
  ind.influencia = clamp(ind.influencia + 4);
  if (comp.includes('Continental') || comp.includes('Mundial')) ind.repInternacional = clamp(ind.repInternacional + 12);
  if (s.flags.premioTitulo) book(s, 'sueldos_jugadores', -estimateRevenue(s, c) * 0.04);
  report.notes.push(`¡${c.name} campeón de la ${comp}!`);
}

function userMatchConsequences(s: GameState, f: Fixture, report: WeekReport) {
  const c = userClub(s)!;
  const rng = rngOf(s);
  const home = f.home === c.id;
  const gf = home ? f.hg! : f.ag!;
  const ga = home ? f.ag! : f.hg!;
  const rival = teamName(s, home ? f.away : f.home);
  if (home && f.stats) {
    book(s, 'entradas', f.stats.gate);
    book(s, 'seguridad', -(c.stadium.capacity * 0.22 * s.economy.securityLevel * (s.ind.barra < 30 ? 1.4 : 1) * (c.division === 1 ? 1 : 0.5)));
  } else {
    const intl = f.comp.startsWith('cont') || f.comp.startsWith('mdc');
    book(s, 'viajes', -((c.division === 1 ? 18_000 : c.division === 2 ? 9_000 : 2_500) * (intl ? 5 : 1)));
  }
  const comp = s.comps[f.comp];
  if (comp && comp.type !== 'league' && f.group === undefined) {
    const won = koWinner(f) === c.id;
    if (won) addPrize(s, c.id, comp.prizeRound, comp.name);
  } else if (comp && comp.type === 'groups_ko' && f.group !== undefined) {
    if (gf > ga) addPrize(s, c.id, Math.round(comp.prizeRound * 0.3), comp.name);
  }
  const h = resultHeadline(rng, c.name, rival, gf, ga, home);
  addNews(s, h.h, h.tone, 'resultado', true);
  // reacción institucional inmediata
  const d = gf - ga;
  s.ind.hinchas = clamp(s.ind.hinchas + (d > 0 ? 1.2 : d < 0 ? -1.5 : -0.2));
  if (c.rivalId && (f.home === c.rivalId || f.away === c.rivalId)) {
    s.ind.hinchas = clamp(s.ind.hinchas + (d > 0 ? 4 : d < 0 ? -5 : 0));
    s.ind.socios = clamp(s.ind.socios + (d > 0 ? 2 : d < 0 ? -2 : 0));
  }
  const coach = c.coachId ? s.coaches[c.coachId] : null;
  if (coach) coach.weeksInCharge++;
  if (s.flags.backedCoachId && coach && s.flags.backedCoachId === coach.id && d < 0 && absWeek(s) - Number(s.flags.backedCoachAbs ?? 0) < 8) s.ind.periodistas = clamp(s.ind.periodistas - 1);
  void report;
}

function weeklyPlayers(s: GameState) {
  const uc = userClub(s);
  for (const p of Object.values(s.players)) {
    if (p.retired || !p.clubId) continue;
    const club = s.clubs[p.clubId];
    const med = club?.facilities.medico ?? 3;
    if (p.injury > 0) p.injury = Math.max(0, p.injury - (med >= 4 ? 1.25 : 1));
    if (p.injury < 0.5) p.injury = 0;
    p.fitness = clamp(p.fitness + 7 + med);
    const target = uc && p.clubId === uc.id ? 50 + s.ind.jugadores * 0.3 : 65;
    p.morale = clamp(p.morale + (target - p.morale) * 0.04);
  }
}

/** Consecuencias sistémicas que no requieren decisión. */
function systemicConsequences(s: GameState, report: WeekReport) {
  const c = userClub(s);
  if (c && s.president.pos === 'club') {
    if (c.fin.wageArrears >= 3 && !s.flags.transferBan) {
      s.flags.transferBan = s.season * 100 + 40;
      s.career.sanctions.push(`${s.season}: Inhibición por deudas salariales`);
      addNews(s, `La AAF inhibe a ${c.name} por deudas salariales`, 'neg', 'sanciones', true);
      report.notes.push('La asociación inhibió al club para incorporar jugadores por las deudas salariales.');
    }
    if (c.fin.wageArrears >= 2 && s.week % 4 === 0 && !s.flags.huelgaJugadores && rngOf(s).chance(0.4)) {
      s.flags.huelgaJugadores = true;
      addNews(s, `Los jugadores de ${c.name} no se presentan a entrenar por los sueldos atrasados`, 'neg', 'crisis', true);
      report.notes.push('El plantel inició una medida de fuerza por sueldos atrasados.');
    } else if (c.fin.wageArrears === 0) s.flags.huelgaJugadores = false;
    const rev = estimateRevenue(s, c);
    if (c.fin.cash < -rev * 0.6 || (c.fin.wageArrears >= 6)) {
      report.notes.push(`La Justicia dispuso la intervención de ${c.name} por la crisis financiera. Quedás fuera del cargo.`);
      addNews(s, `Intervienen ${c.name}: el presidente ${s.president.surname} es desplazado`, 'neg', 'crisis', true);
      s.career.crises++;
      s.ind.repNacional = clamp(s.ind.repNacional - 15);
      s.ind.integridad = clamp(s.ind.integridad - 5);
      leaveClub(s, rngOf(s), null);
    }
  }
}


export function advanceWeek(s: GameState): WeekReport {
  const rng = rngOf(s);
  const report: WeekReport = { season: s.season, week: s.week, userFixtures: [], newEvents: [], news: [], cashDelta: 0, notes: [] };
  if (s.gameOver) return report;
  const newsBefore = s.news[0]?.id;
  report.notes.push(...expireEvents(s, rng));
  if (s.week === 38) setupClubWorldCup(s, rng);
  const cashBefore = userClub(s)?.fin.cash ?? 0;
  playWeekFixtures(s, report);
  // economía
  if (s.president.pos === 'club') report.notes.push(...weeklyClubFinance(s, rng).notes);
  else if (s.president.pos !== 'sin_cargo' && s.president.pos !== 'retirado') weeklyBodyFinance(s);
  weeklyAIFinance(s, rng);
  weeklyPlayers(s);
  aiCoachChanges(s, rng);
  aiTransfers(s, rng);
  const dm = delegatedMarket(s, rng);
  if (dm) report.notes.push(dm);
  if (s.week === 1 || s.week === 21) fillSquads(s, rng);
  if (s.president.pos === 'club') weeklySponsors(s, rng);
  weeklyIndicators(s);
  weeklyCapital(s);
  report.notes.push(...seasonPolitics(s, rng));
  report.notes.push(...weeklyElection(s, rng));
  report.notes.push(...weeklyAssembly(s, rng));
  report.notes.push(...processScheduled(s, rng));
  report.notes.push(...checkPromises(s));
  systemicConsequences(s, report);
  // suspensión cumplida
  if (s.president.suspendedUntil && s.president.suspendedUntil <= absWeek(s)) {
    s.president.suspendedUntil = null;
    report.notes.push('Terminó tu inhabilitación: podés volver a ocupar cargos.');
  }
  report.newEvents = generateWeeklyEvents(s, rng);
  report.cashDelta = (userClub(s)?.fin.cash ?? 0) - cashBefore;
  // avanzar el calendario
  s.week++;
  if (s.week > WEEKS_PER_SEASON) {
    const summary = endSeason(s, rng);
    report.seasonEnded = true;
    report.notes.push(...summary.notes);
    if (s.flags.retireAtSeasonEnd) retire(s, 'Retiro voluntario anunciado');
    else startNewSeason(s, rng);
  }
  const idx = s.news.findIndex((n) => n.id === newsBefore);
  report.news = (idx === -1 ? s.news.slice(0, 8) : s.news.slice(0, idx)).map((n) => n.id);
  s.lastReport = report;
  s.updatedAt = Date.now();
  return report;
}

export interface MultiReport { weeks: WeekReport[]; stopReason: string }

/** Avanza hasta que el club del usuario juegue (o aparezca algo urgente). */
export function simulateToNextMatch(s: GameState, maxWeeks = 8): MultiReport {
  const weeks: WeekReport[] = [];
  for (let i = 0; i < maxWeeks; i++) {
    const b = blockingReason(s);
    if (b) return { weeks, stopReason: b };
    const r = advanceWeek(s);
    weeks.push(r);
    if (r.userFixtures.length) return { weeks, stopReason: 'Partido disputado.' };
    if (r.seasonEnded) return { weeks, stopReason: 'Terminó la temporada.' };
    if (r.newEvents.some((uid) => s.inbox.find((e) => e.uid === uid)?.urgency === 'urgente')) return { weeks, stopReason: 'Apareció una decisión urgente.' };
  }
  return { weeks, stopReason: 'No hay partidos en las próximas semanas.' };
}

/** Avanza varias semanas deteniéndose ante decisiones urgentes. */
export function advanceMany(s: GameState, n: number, stopOnImportant = false): MultiReport {
  const weeks: WeekReport[] = [];
  for (let i = 0; i < n; i++) {
    const b = blockingReason(s);
    if (b) return { weeks, stopReason: b };
    const r = advanceWeek(s);
    weeks.push(r);
    if (r.seasonEnded) return { weeks, stopReason: 'Terminó la temporada.' };
    const fresh = r.newEvents.map((uid) => s.inbox.find((e) => e.uid === uid)).filter(Boolean);
    if (fresh.some((e) => e!.urgency === 'urgente')) return { weeks, stopReason: 'Apareció una decisión urgente.' };
    if (stopOnImportant && fresh.some((e) => e!.urgency === 'importante')) return { weeks, stopReason: 'Apareció un acontecimiento importante.' };
  }
  return { weeks, stopReason: stopOnImportant ? 'No hubo acontecimientos importantes.' : 'Fin del período simulado.' };
}

export function retire(s: GameState, reason: string) {
  s.gameOver = { reason, abs: absWeek(s) };
  s.president.pos = 'retirado';
  s.career.positions.forEach((p) => (p.to === null || p.to === undefined) && (p.to = s.season));
  addNews(s, `${s.president.name} ${s.president.surname} se retira de la dirigencia`, 'neu', 'carrera', true);
}

export function eventCount() {
  return Object.keys(EVENTS).length;
}

export function personalContribution(s: GameState, amount: number): string {
  if (s.president.pos !== 'club') return 'Sólo podés aportar dinero a un club que presidas.';
  if (amount <= 0 || amount > s.president.wealth) return 'Tu patrimonio personal no alcanza.';
  s.president.wealth -= amount;
  book(s, 'aportes', amount);
  s.ind.socios = clamp(s.ind.socios + Math.min(6, amount / 200_000));
  s.ind.comision = clamp(s.ind.comision + 2);
  addNews(s, `${s.president.surname} aporta ${money(amount)} de su bolsillo al club`, 'pos', 'finanzas', true);
  return `Aportaste ${money(amount)} de tu patrimonio personal a la caja del club.`;
}

export { mulberry };
