// Generación inicial del universo futbolístico.
import type { GameState, Club, Player, Position, Coach, Character, Role, CharPersonality, CoachPersonality, CrestDef, Nation } from './types';
import type { RNG } from './rng';
import { ARG_PRIMERA, ARG_NACIONAL, ARG_FEDERAL, FOREIGN } from './data/clubs';
import { NATIONS, COMPANIES, CONFEDS } from './data/world';
import { personName } from './data/names';
import { clamp, newId } from './util';
import { playerValue, wageFor, coachWage, estimateRevenue, sponsorPotential } from './valuation';

const POS_PLAN: Position[] = ['POR', 'POR', 'POR', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'MED', 'MED', 'MED', 'MED', 'MED', 'DEL', 'DEL', 'DEL', 'DEL', 'DEL'];

export function clubLevel(c: Club): number {
  if (c.division === 0) return c.strength ?? 70;
  if (c.division === 1) return 40 + c.prestige * 0.4;
  if (c.division === 2) return 37 + c.prestige * 0.36;
  return 33 + c.prestige * 0.36;
}

export function randomAge(rng: RNG): number {
  const r = rng.next();
  if (r < 0.12) return rng.int(17, 19);
  if (r < 0.35) return rng.int(20, 23);
  if (r < 0.72) return rng.int(24, 28);
  if (r < 0.92) return rng.int(29, 32);
  return rng.int(33, 36);
}

export function potentialFor(rng: RNG, ovr: number, age: number): number {
  let gap = 0;
  if (age <= 19) gap = rng.int(6, 22);
  else if (age <= 21) gap = rng.int(4, 16);
  else if (age <= 24) gap = rng.int(1, 9);
  else if (age <= 27) gap = rng.int(0, 3);
  return clamp(ovr + gap, ovr, 96);
}

export function makePlayer(s: GameState, rng: RNG, o: { nat: string; pos: Position; ovr: number; age: number; club: Club | null; contractYears?: number; youth?: boolean }): Player {
  const ovr = Math.round(clamp(o.ovr, 35, 94));
  const pot = potentialFor(rng, ovr, o.age);
  const id = newId(s, 'p');
  const p: Player = {
    id,
    name: personName(rng, o.nat),
    age: o.age,
    nat: o.nat,
    pos: o.pos,
    ovr,
    pot,
    value: 0,
    wage: 0,
    contractEnd: s.season + (o.contractYears ?? rng.int(1, 4)),
    morale: rng.int(55, 80),
    popularity: clamp(Math.round((ovr - 45) * 1.6 + rng.int(-10, 15) + (o.age > 29 ? 8 : 0))),
    fitness: rng.int(85, 100),
    injury: 0,
    agentId: null,
    clubId: o.club ? o.club.id : null,
    season: { apps: 0, goals: 0, assists: 0, cards: 0, rating: 0 },
    career: { apps: 0, goals: 0, titles: 0, clubs: o.club ? [o.club.short] : [] },
    history: [],
    youth: o.youth,
  };
  p.value = playerValue(p, p.contractEnd - s.season);
  p.wage = o.club ? wageFor(p, o.club) : Math.round(wageFor(p, { division: 2, prestige: 50 } as Club) * 0.8);
  s.players[id] = p;
  return p;
}

export function makeCoach(s: GameState, rng: RNG, level: number, clubId: string | null, nat = 'ARG'): Coach {
  const id = newId(s, 'c');
  const personalities: CoachPersonality[] = ['pragmatico', 'ofensivo', 'disciplinario', 'carismatico', 'conflictivo', 'formador'];
  const co: Coach = {
    id,
    name: personName(rng, nat),
    age: rng.int(36, 68),
    nat,
    ability: clamp(Math.round(level + rng.int(-8, 8)), 30, 95),
    experience: rng.int(20, 95),
    leadership: rng.int(30, 95),
    youthDev: rng.int(20, 95),
    squadRel: rng.int(35, 90),
    popularity: clamp(Math.round(level - 10 + rng.int(-15, 20))),
    wageDemand: 0,
    wage: 0,
    personality: rng.pick(personalities),
    clubId,
    contractEnd: s.season + rng.int(1, 2),
    confidence: rng.int(55, 80),
    opinion: rng.int(-10, 20),
    memory: [],
    tags: [],
    titles: Math.max(0, Math.round((level - 55) / 6 + rng.int(-2, 2))),
    weeksInCharge: rng.int(0, 60),
  };
  co.wageDemand = coachWage(co);
  co.wage = co.wageDemand;
  s.coaches[id] = co;
  return co;
}

const CHAR_PERS: CharPersonality[] = ['leal', 'ambicioso', 'pragmatico', 'corrupto', 'idealista', 'conflictivo', 'conservador', 'oportunista'];

export function makeChar(s: GameState, rng: RNG, role: Role, title: string, extra: Partial<Character> = {}): Character {
  const id = newId(s, 'h');
  const ch: Character = {
    id,
    name: personName(rng, extra.nation ?? 'ARG'),
    role,
    title,
    personality: rng.pick(CHAR_PERS),
    ambition: rng.int(20, 95),
    trust: rng.int(30, 70),
    loyalty: rng.int(20, 90),
    influence: rng.int(20, 80),
    wealth: rng.int(10, 90),
    opinion: rng.int(-15, 25),
    memory: [],
    active: true,
    age: rng.int(35, 72),
    tags: [],
    ...extra,
  };
  s.chars[id] = ch;
  return ch;
}

function crestOf(row: { shape: CrestDef['shape']; pattern: CrestDef['pattern']; c1: string; c2: string }): CrestDef {
  return { shape: row.shape, pattern: row.pattern, c1: row.c1, c2: row.c2 };
}

export function generateWorld(s: GameState, rng: RNG) {
  // ---------- Clubes argentinos ----------
  const groups: [typeof ARG_PRIMERA, number][] = [[ARG_PRIMERA, 1], [ARG_NACIONAL, 2], [ARG_FEDERAL, 3]];
  const shortToId: Record<string, string> = {};
  const rivalShort: Record<string, string | undefined> = {};
  for (const [rows, div] of groups) {
    for (const r of rows) {
      const [name, short, city, prestige, c1, c2, stadium, capacity, members, shape, pattern, rival] = r;
      const id = `cl_${short.toLowerCase()}`;
      const c: Club = {
        id, name, short: short.slice(0, 3), city, country: 'ARG', division: div, prestige,
        members, fanBase: Math.round(members * (div === 1 ? 14 : 9)),
        stadium: { name: stadium, capacity },
        facilities: {
          estadio: clamp(Math.round(prestige / 22), 1, 5), entrenamiento: clamp(Math.round(prestige / 24), 1, 5), juveniles: clamp(Math.round(prestige / 22) + rng.int(-1, 1), 1, 5),
          social: clamp(Math.round(prestige / 25), 1, 5), tienda: clamp(Math.round(prestige / 25), 1, 5), museo: prestige > 70 ? 2 : 1, medico: clamp(Math.round(prestige / 25), 1, 5), administracion: clamp(Math.round(prestige / 30), 1, 4),
        },
        crest: crestOf({ shape, pattern, c1, c2 }),
        fin: { cash: 0, debt: 0, payables: 0, wageArrears: 0 },
        coachId: null, presidentId: null,
        nextElection: s.season + rng.int(0, 3),
        form: [], history: [], titles: [],
      };
      c.sponsorIncome = sponsorPotential(c);
      s.clubs[id] = c;
      shortToId[short] = id;
      rivalShort[id] = rival;
    }
  }
  for (const [id, rs] of Object.entries(rivalShort)) if (rs && shortToId[rs]) s.clubs[id].rivalId = shortToId[rs];

  // ---------- Clubes extranjeros ----------
  for (const [name, short, city, country, strength, c1, c2] of FOREIGN) {
    const id = `fx_${short.toLowerCase()}`;
    const c: Club = {
      id, name, short, city, country, division: 0, prestige: clamp(strength + 5), members: 0, fanBase: 0,
      stadium: { name: `Estadio de ${city}`, capacity: 50000 },
      facilities: { estadio: 5, entrenamiento: 5, juveniles: 4, social: 4, tienda: 5, museo: 4, medico: 5, administracion: 5 },
      crest: { shape: rng.pick(['escudo', 'circulo', 'clasico'] as const), pattern: rng.pick(['liso', 'franja', 'bastones', 'banda'] as const), c1, c2 },
      fin: { cash: 50_000_000, debt: 0, payables: 0, wageArrears: 0 },
      coachId: null, presidentId: null, nextElection: 9999, strength, form: [], history: [], titles: [],
    };
    s.clubs[id] = c;
  }

  // ---------- Planteles ----------
  for (const c of Object.values(s.clubs)) {
    const lvl = clubLevel(c);
    const plan = c.division === 0 ? POS_PLAN.slice(0, 22) : POS_PLAN;
    plan.forEach((pos, i) => {
      const age = randomAge(rng);
      const tier = i % 8 < 4 ? 2 : i % 8 < 6 ? -2 : -5;
      const ovr = rng.normal(lvl + tier - (c.division === 0 ? 3 : 0), c.division === 0 ? 3 : 3.5) - (age < 20 ? 6 : 0);
      let nat = c.country;
      if (c.country === 'ARG') nat = rng.chance(0.12) ? rng.pick(['URU', 'PAR', 'COL', 'CHI', 'BRA']) : 'ARG';
      else if (c.division === 0) nat = rng.chance(0.14) ? 'ARG' : rng.chance(0.25) ? rng.pick(['BRA', 'URU', 'COL', 'FRA', 'ESP', 'POR']) : c.country === 'USA' || c.country === 'KSA' ? (rng.chance(0.5) ? c.country : rng.pick(['BRA', 'ESP', 'FRA', 'ARG'])) : c.country;
      makePlayer(s, rng, { nat, pos, ovr, age, club: c });
    });
    const co = makeCoach(s, rng, c.division === 0 ? lvl + 5 : lvl, c.id, c.country === 'ARG' ? 'ARG' : rng.chance(0.3) ? 'ARG' : c.country);
    if (c.division > 0) co.wage = Math.round((co.wageDemand * (c.division === 1 ? 1 : c.division === 2 ? 0.6 : 0.35)) / 500) * 500;
    c.coachId = co.id;
  }
  // Agentes libres y entrenadores libres
  for (let i = 0; i < 45; i++) makePlayer(s, rng, { nat: rng.chance(0.75) ? 'ARG' : rng.pick(['URU', 'PAR', 'COL', 'CHI', 'BRA']), pos: rng.pick(POS_PLAN), ovr: rng.normal(57, 8), age: rng.int(19, 34), club: null, contractYears: 0 });
  for (let i = 0; i < 18; i++) makeCoach(s, rng, rng.int(48, 78), null);

  // ---------- Representantes ----------
  const agents: Character[] = [];
  const agencies = ['Grupo Talento Sur', 'Pampa Sports Management', 'Gol Global Agency', 'Cono Sur Players', 'Elite Fútbol Group', 'Atlántico Representaciones', 'Primera Línea Agentes', 'Rioplatense Football', 'Futuro Crack Agency', 'Andes Management'];
  for (const ag of agencies) agents.push(makeChar(s, rng, 'representante', `Representante — ${ag}`, { influence: rng.int(30, 90), wealth: rng.int(40, 95) }));
  for (const p of Object.values(s.players)) p.agentId = rng.weighted(agents, (a) => a.influence)!.id;

  // ---------- Presidentes de clubes argentinos ----------
  const blocs = ['oficialismo', 'oposicion', 'independiente'] as const;
  for (const c of Object.values(s.clubs)) {
    if (c.country !== 'ARG') continue;
    const ch = makeChar(s, rng, 'presidente_club', `Presidente de ${c.name}`, { clubId: c.id, influence: clamp(Math.round(c.prestige * 0.8 + rng.int(-15, 10))), bloc: rng.weighted(blocs as unknown as string[], (b) => (b === 'oficialismo' ? 5 : b === 'oposicion' ? 3 : 2)) as Character['bloc'] });
    c.presidentId = ch.id;
  }

  // ---------- Prensa, política, negocios ----------
  const press = ['Diario Olé del Plata', 'Radio Continental Sport', 'TyC Deportes Sur', 'El Gráfico Digital', 'La Nación Deportiva', 'Streaming "Pasión Futbolera"'];
  for (const m of press) makeChar(s, rng, 'periodista', `Periodista — ${m}`, { influence: rng.int(35, 90) });
  makeChar(s, rng, 'politico', 'Intendente municipal', { influence: 55 });
  makeChar(s, rng, 'politico', 'Gobernador provincial', { influence: 75 });
  makeChar(s, rng, 'politico', 'Secretario de Deportes de la Nación', { influence: 80 });
  makeChar(s, rng, 'politico', 'Diputado nacional opositor', { influence: 60 });
  for (const t of ['Empresario de medios', 'Empresario de la construcción', 'Inversor de fondos', 'Empresario del juego', 'Banquero']) makeChar(s, rng, 'empresario', t, { wealth: rng.int(60, 99), influence: rng.int(40, 85) });
  makeChar(s, rng, 'referente_hinchas', 'Referente de la peña más grande', { influence: 50 });

  // ---------- Asociación nacional ----------
  const assocPres = makeChar(s, rng, 'presidente_asociacion', 'Presidente de la Asociación Argentina de Fútbol', { influence: 92, ambition: 85, age: 62, bloc: 'oficialismo' });
  const vps = [makeChar(s, rng, 'dirigente_asociacion', 'Vicepresidente 1º de la AAF', { influence: 70, bloc: 'oficialismo' }), makeChar(s, rng, 'dirigente_asociacion', 'Secretario general de la AAF', { influence: 65, bloc: 'oficialismo' }), makeChar(s, rng, 'dirigente_asociacion', 'Tesorero de la AAF', { influence: 60, bloc: 'oficialismo' })];
  const primeraPres = Object.values(s.clubs).filter((c) => c.division === 1).map((c) => s.chars[c.presidentId!]).sort((a, b) => b.influence - a.influence);
  s.assoc = {
    name: 'Asociación Argentina de Fútbol', short: 'AAF', presidentId: assocPres.id,
    committee: primeraPres.slice(0, 8).map((c) => c.id), userOnCommittee: false,
    nextElection: s.season + 2, nextCommittee: s.season + 1,
    tvModel: 'mixto', tvPool: 95_000_000, rules: { extranjeros: 6, topeSalarial: false, var: true, descensos: 2, ascensos: 2, visitantes: false, fairPlay: false },
    proposals: [], budget: 40_000_000, history: [`${assocPres.name} preside la AAF.`, ...vps.map((v) => `${v.name}: ${v.title}.`)],
  };

  // ---------- Finanzas iniciales de clubes argentinos ----------
  for (const c of Object.values(s.clubs)) {
    if (c.division === 0) continue;
    const rev = estimateRevenue(s, c);
    c.fin.cash = Math.round(rev * rng.float(0.04, 0.12));
    c.fin.debt = Math.round(rev * rng.float(0, 0.35));
    c.aiBudget = Math.round(rev * 0.08);
  }

  // ---------- Selecciones, federaciones y organismos internacionales ----------
  const csfPresidents: string[] = [];
  for (const [code, name, confed, strength] of NATIONS) {
    const n: Nation = { code, name, confed, strength, roster: [], coachName: personName(rng, code === 'ARG' ? 'ARG' : code) };
    for (let i = 0; i < 14; i++) n.roster.push(personName(rng, code));
    if (code !== 'ARG') {
      const pr = makeChar(s, rng, 'presidente_federacion', `Presidente de la federación de ${name}`, { nation: code, confed, influence: clamp(strength - 10 + rng.int(-10, 10)) });
      n.presidentId = pr.id;
      if (confed === 'CSF') csfPresidents.push(pr.id);
    } else n.presidentId = assocPres.id;
    s.nations[code] = n;
  }
  const confedPres = makeChar(s, rng, 'presidente_confederacion', 'Presidente de la Confederación Sudamericana', { influence: 90, age: 66, nation: 'PAR', confed: 'CSF' });
  s.confed = { name: CONFEDS.CSF.name, short: 'CSF', presidentId: confedPres.id, nextElection: s.season + 4, budget: 220_000_000, members: csfPresidents, history: [`${confedPres.name} preside la CSF.`] };
  const leaders: string[] = [];
  for (const [k, cf] of Object.entries(CONFEDS)) {
    if (k === 'CSF') {
      leaders.push(confedPres.id);
      continue;
    }
    leaders.push(makeChar(s, rng, 'presidente_confederacion', `Presidente de la ${cf.name}`, { confed: k, nation: k, influence: rng.int(70, 95), age: rng.int(50, 70) }).id);
  }
  const fifaPres = makeChar(s, rng, 'presidente_fifa', 'Presidente de la Federación Internacional de Fútbol', { influence: 99, age: 60, nation: 'SUI' });
  s.fifa = { name: 'Federación Internacional de Fútbol', short: 'FIF', presidentId: fifaPres.id, nextElection: s.season + 5, budget: 4_000_000_000, members: leaders, history: [`${fifaPres.name} preside la FIF.`], hostDecided: {} };

  // ---------- Empresas ----------
  for (const [name, sector, capacity, reputation, sensitivity, controversy, demand] of COMPANIES) {
    const id = newId(s, 'co');
    s.companies[id] = { id, name, sector, capacity, reputation, sensitivity, controversy, demand };
  }

  // Seleccionador nacional
  const ntCoach = makeCoach(s, rng, 82, null, 'ARG');
  ntCoach.nationalTeam = 'ARG';
  s.nt = { coachId: ntCoach.id, objective: 'Clasificar al Mundial', bonus: 0, youthInvest: 1, facilities: 3, results: [], morale: 70 };
}

/** Plantel interno de un club cuando el usuario asume su presidencia. */
export function ensureClubStaff(s: GameState, rng: RNG, c: Club) {
  if (c.staff && c.staff.vicepresidente) return;
  const mk = (role: Role, title: string, extra: Partial<Character> = {}) => makeChar(s, rng, role, title, { clubId: c.id, ...extra }).id;
  c.staff = {
    vicepresidente: mk('vicepresidente', `Vicepresidente de ${c.name}`, { ambition: rng.int(40, 95) }),
    tesorero: mk('tesorero', `Tesorero de ${c.name}`),
    director_deportivo: mk('director_deportivo', `Director deportivo de ${c.name}`),
    lider_barra: mk('lider_barra', `Referente de la barra de ${c.name}`, { personality: rng.pick(['conflictivo', 'corrupto', 'oportunista'] as CharPersonality[]), influence: rng.int(40, 80) }),
    lider_socios: mk('lider_socios', `Referente de la agrupación oficialista`),
    opositor: mk('opositor', `Líder de la agrupación opositora`, { opinion: rng.int(-45, -15), ambition: rng.int(60, 95), influence: rng.int(30, 70) }),
    vocales: [mk('vocal', `Vocal titular de ${c.name}`), mk('vocal', `Vocal titular de ${c.name}`), mk('vocal', `Vocal de la oposición`, { opinion: -20 })],
  };
}
