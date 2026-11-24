// ============================================================================
// EL PRESIDENTE — Tipos centrales del estado del juego
// Todo el estado es serializable (JSON) para guardado local / futura base de datos.
// ============================================================================

export type ID = string;

export const IND_KEYS = [
  'socios', 'hinchas', 'barra', 'patrocinadores', 'jugadores', 'dt', 'comision', 'empleados',
  'asociacion', 'presidentes', 'representantes', 'periodistas', 'influencia', 'repNacional',
  'repInternacional', 'integridad', 'riesgo', 'estabilidad', 'prestigio', 'gobernabilidad',
] as const;
export type IndKey = (typeof IND_KEYS)[number];
export type Indicators = Record<IndKey, number>;

export type Position = 'POR' | 'DEF' | 'MED' | 'DEL';

export type Difficulty = 'facil' | 'normal' | 'dificil' | 'leyenda';
export type GameMode = 'rapido' | 'normal' | 'detallado';

export type PersonalityId =
  | 'empresario' | 'historico' | 'exjugador' | 'politico'
  | 'millonario' | 'representante' | 'hincha' | 'administrador';

export type CareerPos = 'club' | 'sin_cargo' | 'asociacion' | 'confederacion' | 'fifa' | 'retirado';

export interface PlayerSeasonStats { apps: number; goals: number; assists: number; cards: number; rating: number }

export interface Player {
  id: ID;
  name: string;
  age: number;
  nat: string; // código país
  pos: Position;
  ovr: number;
  pot: number;
  value: number; // USD
  wage: number; // USD mensual
  contractEnd: number; // temporada (año) en que vence
  morale: number;
  popularity: number;
  fitness: number;
  injury: number; // semanas de baja
  agentId: ID | null;
  clubId: ID | null; // null = libre
  loanFrom?: ID | null;
  loanUntil?: number;
  listed?: boolean;
  youth?: boolean;
  season: PlayerSeasonStats;
  career: { apps: number; goals: number; titles: number; clubs: string[] };
  history: string[];
  signedFee?: number; // precio pagado por el club actual (detectar fichajes fallidos)
  signedSeason?: number;
  retired?: boolean;
  tags?: string[];
}

export interface Coach {
  id: ID;
  name: string;
  age: number;
  nat: string;
  ability: number;
  experience: number;
  leadership: number;
  youthDev: number;
  squadRel: number;
  popularity: number;
  wageDemand: number; // USD mensual pretendido
  wage: number;
  personality: CoachPersonality;
  clubId: ID | null;
  nationalTeam?: string | null;
  contractEnd: number;
  confidence: number; // confianza del entrenador en su puesto / presión
  opinion: number; // -100..100 opinión sobre el presidente usuario
  memory: MemoryEntry[];
  tags: string[];
  titles: number;
  weeksInCharge: number;
}
export type CoachPersonality = 'pragmatico' | 'ofensivo' | 'disciplinario' | 'carismatico' | 'conflictivo' | 'formador';

export interface MemoryEntry { s: number; w: number; t: string; d: number }

export type Role =
  | 'vicepresidente' | 'tesorero' | 'vocal' | 'director_deportivo' | 'lider_barra' | 'lider_socios'
  | 'opositor' | 'representante' | 'empresario' | 'periodista' | 'politico'
  | 'presidente_asociacion' | 'presidente_club' | 'dirigente_asociacion'
  | 'presidente_federacion' | 'presidente_confederacion' | 'presidente_fifa' | 'referente_hinchas';

export type CharPersonality = 'leal' | 'ambicioso' | 'pragmatico' | 'corrupto' | 'idealista' | 'conflictivo' | 'conservador' | 'oportunista';

export interface Character {
  id: ID;
  name: string;
  role: Role;
  title: string; // cargo legible
  clubId?: ID | null;
  nation?: string;
  confed?: string;
  personality: CharPersonality;
  ambition: number;
  trust: number;
  loyalty: number;
  influence: number;
  wealth: number;
  opinion: number; // -100..100 sobre el presidente usuario
  memory: MemoryEntry[];
  bloc?: 'oficialismo' | 'oposicion' | 'independiente';
  active: boolean;
  age: number;
  tags: string[];
}

export interface CrestDef { shape: 'escudo' | 'circulo' | 'diamante' | 'rombo' | 'clasico'; pattern: 'liso' | 'franja' | 'bastones' | 'banda' | 'mitad'; c1: string; c2: string; }

export interface ClubFinances {
  cash: number;
  debt: number; // deuda bancaria/total estructurada (préstamos)
  payables: number; // deudas comerciales/atrasos
  wageArrears: number; // semanas con sueldos atrasados
}

export type FacilityKey = 'estadio' | 'entrenamiento' | 'juveniles' | 'social' | 'tienda' | 'museo' | 'medico' | 'administracion';

export interface Club {
  id: ID;
  name: string;
  short: string;
  city: string;
  country: string;
  division: number; // 1..3 en Argentina; 0 = club extranjero
  prestige: number;
  members: number; // socios
  fanBase: number; // hinchas (miles)
  stadium: { name: string; capacity: number };
  facilities: Record<FacilityKey, number>; // niveles 1..5
  crest: CrestDef;
  fin: ClubFinances;
  coachId: ID | null;
  presidentId: ID | null; // personaje presidente (NPC) — null si lo preside el usuario
  staff?: Partial<Record<'vicepresidente' | 'tesorero' | 'director_deportivo' | 'lider_barra' | 'lider_socios' | 'opositor', ID>> & { vocales?: ID[] };
  nextElection: number; // temporada de próxima elección
  strength?: number; // sólo clubes extranjeros: fuerza base
  rivalId?: ID | null; // clásico
  form: string[]; // últimos resultados 'G','E','P'
  history: { season: number; division: number; pos: number; titles: string[] }[];
  titles: { season: number; comp: string }[];
  aiBudget?: number;
  sponsorIncome?: number; // ingresos patrocinio anuales estimados (IA)
}

export interface TableRow { id: ID; pj: number; g: number; e: number; p: number; gf: number; gc: number; pts: number; form: string[] }

export interface MatchEvent { min: number; type: 'gol' | 'ocasion' | 'amarilla' | 'roja' | 'penal' | 'penal_errado' | 'lesion' | 'atajada' | 'entretiempo' | 'final' | 'inicio' | 'var' | 'cambio'; team: 'h' | 'a' | null; playerId?: ID; playerName?: string; text: string }

export interface MatchStats { posH: number; shotsH: number; shotsA: number; onH: number; onA: number; yH: number; yA: number; rH: number; rA: number; att: number; gate: number; xgH: number; xgA: number }

export interface Fixture {
  id: ID;
  comp: ID;
  week: number;
  round: string;
  home: ID;
  away: ID;
  played: boolean;
  hg?: number;
  ag?: number;
  pens?: [number, number];
  scorers?: { t: 'h' | 'a'; p: ID | string; m: number }[];
  stats?: MatchStats;
  events?: MatchEvent[];
  national?: boolean;
  group?: number;
  neutral?: boolean;
  koSlot?: number; // posición en el cuadro
}

export interface Competition {
  id: ID;
  name: string;
  short: string;
  type: 'league' | 'cup' | 'groups_ko';
  scope: 'club' | 'national';
  division?: number;
  season: number;
  participants: ID[];
  table: TableRow[];
  groups?: { name: string; teams: ID[]; table: TableRow[] }[];
  koWeeks: { name: string; week: number }[];
  koIndex: number;
  koAlive: ID[]; // equipos vivos en eliminatorias
  stage: 'league' | 'groups' | 'ko' | 'done';
  winner?: ID | null;
  runnerUp?: ID | null;
  prizeWin: number;
  prizeRound: number;
  promo?: number;
  releg?: number;
  intlSpots?: number;
  advance?: number; // clasificados por grupo
  carry?: [ID, ID][][]; // rondas pendientes para la temporada siguiente (eliminatorias)
  carryWeeks?: number[];
  persistent?: boolean;
  host?: string;
}

export interface Nation { code: string; name: string; confed: string; strength: number; roster: string[]; coachName: string; presidentId?: ID }

export type LedgerCat =
  | 'cuotas' | 'entradas' | 'tv' | 'patrocinio' | 'merchandising' | 'premios' | 'ventas' | 'eventos' | 'aportes' | 'alquiler' | 'prestamos_in'
  | 'sueldos_jugadores' | 'sueldos_empleados' | 'cuerpo_tecnico' | 'fichajes' | 'comisiones' | 'mantenimiento' | 'seguridad' | 'servicios' | 'viajes' | 'deuda' | 'intereses' | 'indemnizaciones' | 'obras' | 'multas' | 'otros';

export interface Loan { id: ID; lender: string; principal: number; balance: number; rate: number; weeksLeft: number; payment: number; takenSeason: number }

export interface SponsorCompany { id: ID; name: string; sector: string; capacity: number; reputation: number; sensitivity: number; controversy: number; demand: string; ownerId?: ID | null }
export type SponsorSlot = 'principal' | 'indumentaria' | 'estadio' | 'naming' | 'regional' | 'internacional';
export interface SponsorContract { id: ID; companyId: ID; slot: SponsorSlot; annual: number; until: number; bonus: number; penalty: number; signedSeason: number }
export interface SponsorOffer { id: ID; companyId: ID; slot: SponsorSlot; annual: number; years: number; bonus: number; penalty: number; expires: number; negotiated?: boolean }

export interface InfraProject { id: ID; facility: FacilityKey; name: string; cost: number; paid: number; weeksTotal: number; weeksLeft: number; toLevel: number; startedAbs: number; delayed?: boolean; financed?: boolean }

export type Urgency = 'urgente' | 'importante' | 'informativo';

export interface Bindings {
  playerId?: ID; charId?: ID; char2Id?: ID; coachId?: ID; clubId?: ID; sponsorId?: ID; agentId?: ID;
  amount?: number; amount2?: number; nation?: string; text?: string; n?: number;
}

export interface PendingEvent {
  uid: ID;
  defId: string;
  createdAbs: number;
  expiresAbs: number;
  b: Bindings;
  urgency: Urgency;
  severity: number;
  title: string; // título renderizado
  text: string; // descripción renderizada
}

export interface ResolvedEvent { defId: string; uid: ID; title: string; season: number; week: number; choice: string; outcome: string; auto?: boolean; cat: string }

export interface Scheduled { at: number; kind: 'event' | 'effect'; id: string; b: Bindings; p?: number; params?: Record<string, any>; tag?: string }

export interface PromiseItem { id: ID; text: string; key: string; deadlineAbs: number; madeAbs: number; to?: ID | null; target?: number; kept?: boolean | null; weight: number }

export interface NewsItem { id: ID; season: number; week: number; headline: string; body?: string; tone: 'pos' | 'neg' | 'neu'; tag?: string; mine?: boolean }

export interface Offer { id: ID; playerId: ID; fromClub: ID; amount: number; expiresAbs: number; kind: 'compra' | 'prestamo' }

export interface ElectionCandidate { id: ID; name: string; charId?: ID | null; isUser?: boolean; support: number; withdrawn?: boolean; platform?: string }
export interface Election {
  id: ID;
  kind: 'club' | 'asociacion' | 'confederacion' | 'fifa' | 'comite';
  clubId?: ID | null;
  weekAbs: number; // semana absoluta de votación
  candidates: ElectionCandidate[];
  polls: { abs: number; values: Record<ID, number> }[];
  userRunning: boolean;
  actionsUsed: string[];
  campaignPoints: number;
  done?: boolean;
  winner?: ID;
  result?: Record<ID, number>;
  debateDone?: boolean;
}

export interface Proposal { id: ID; key: string; title: string; text: string; byUser?: boolean; proposerId?: ID | null; voteAbs: number; userVote?: 'si' | 'no' | 'abstencion' | null; result?: { si: number; no: number; abst: number; passed: boolean } }

export interface AssociationState {
  name: string;
  short: string;
  presidentId: ID | null; // null si es el usuario
  committee: ID[]; // ids de personajes (presidentes de clubes)
  userOnCommittee: boolean;
  nextElection: number; // temporada
  nextCommittee: number;
  tvModel: 'equitativo' | 'mixto' | 'meritocratico';
  tvPool: number; // USD anual repartido a primera división
  rules: Record<string, number | boolean | string>;
  proposals: Proposal[];
  budget: number; // caja de la asociación
  history: string[];
}

export interface NationalTeamState {
  coachId: ID | null;
  objective: string;
  bonus: number;
  youthInvest: number;
  facilities: number;
  results: { season: number; comp: string; text: string }[];
  table?: TableRow[]; // eliminatorias
  qualified?: boolean;
  morale: number;
}

export interface IntlBodyState {
  name: string;
  short: string;
  presidentId: ID | null;
  nextElection: number;
  budget: number;
  members: ID[]; // personajes presidentes de federaciones / confederaciones
  history: string[];
  hostDecided?: Record<number, string>;
  revenueModel?: string;
}

export interface CareerRecord {
  clubs: { clubId: ID; name: string; from: number; to?: number | null }[];
  positions: { pos: CareerPos | 'comite'; label: string; from: number; to?: number | null }[];
  titles: { season: number; comp: string; club: string }[];
  promotions: number;
  relegations: number;
  electionsWon: number;
  electionsLost: number;
  moneyGenerated: number;
  works: string[];
  signings: string[];
  crises: number;
  sanctions: string[];
  milestones: { season: number; week: number; text: string }[];
  peakLevel: number;
}

export interface SeasonSummary {
  season: number;
  champions: Record<string, string>; // compId -> nombre club
  userClub?: string | null;
  userPos?: number | null;
  userDivision?: number | null;
  promoted: string[];
  relegated: string[];
  topScorer?: string;
  finances?: { income: number; expense: number; cashEnd: number; debtEnd: number };
  notes: string[];
}

export interface Objective { id: ID; text: string; key: string; target: number; importance: 'minimo' | 'esperado' | 'ideal'; done?: boolean | null }

export interface Settings { difficulty: Difficulty; mode: GameMode; liveMatches: boolean; liveSpeed: number; delegate: { mercado: boolean; finanzasMenores: boolean; prensa: boolean } }

export interface PresidentProfile {
  name: string;
  surname: string;
  nationality: string;
  age: number;
  personality: PersonalityId;
  wealth: number; // patrimonio personal USD
  pos: CareerPos;
  clubId: ID | null;
  mandateStart: number;
  mandateEnd: number; // temporada en que vence el mandato actual
  mandateYears: number;
  health: number;
  suspendedUntil?: number | null; // semana absoluta
  committee: boolean;
  politicalCapital: number; // acciones políticas disponibles (se recarga)
  lastActionAbs: Record<string, number>;
}

export interface GameState {
  v: number;
  id: ID;
  name: string;
  seed: number;
  rng: number;
  createdAt: number;
  updatedAt: number;
  startSeason: number;
  season: number;
  week: number;
  settings: Settings;
  president: PresidentProfile;
  ind: Indicators;
  indHistory: { abs: number; v: Partial<Indicators> }[];
  clubs: Record<ID, Club>;
  players: Record<ID, Player>;
  coaches: Record<ID, Coach>;
  chars: Record<ID, Character>;
  companies: Record<ID, SponsorCompany>;
  nations: Record<string, Nation>;
  comps: Record<ID, Competition>;
  fixtures: Fixture[];
  // economía del club del usuario
  ledger: Partial<Record<LedgerCat, number>>; // temporada actual
  ledgerHistory: { season: number; data: Partial<Record<LedgerCat, number>> }[];
  cashHistory: { abs: number; cash: number; debt: number }[];
  loans: Loan[];
  sponsors: SponsorContract[];
  sponsorOffers: SponsorOffer[];
  economy: { ticketMult: number; feeMult: number; transferBudget: number; wageCap: number; emergency: boolean; emergencyAbs?: number | null; securityLevel: number; budgetApproved?: number | null; staffCost: number };
  projects: InfraProject[];
  inbox: PendingEvent[];
  resolved: ResolvedEvent[];
  cooldowns: Record<string, number>;
  eventCounts: Record<string, number>;
  scheduled: Scheduled[];
  promises: PromiseItem[];
  flags: Record<string, number | string | boolean>;
  news: NewsItem[];
  offers: Offer[];
  election: Election | null;
  assoc: AssociationState;
  confed: IntlBodyState;
  fifa: IntlBodyState;
  nt: NationalTeamState;
  career: CareerRecord;
  objectives: Objective[];
  seasons: SeasonSummary[];
  lastReport?: WeekReport | null;
  gameOver?: { reason: string; abs: number } | null;
  uid: number;
}

export interface WeekReport {
  season: number;
  week: number;
  userFixtures: ID[];
  newEvents: ID[];
  news: ID[];
  cashDelta: number;
  notes: string[];
  seasonEnded?: boolean;
}

export const WEEKS_PER_SEASON = 40;
