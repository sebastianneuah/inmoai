// Motor económico: ingresos y egresos semanales, préstamos, obras y finanzas de la IA.
import type { GameState, LedgerCat, Club, FacilityKey, Loan } from './types';
import type { RNG } from './rng';
import { clamp, newId, money } from './util';
import { userClub, squad } from './queries';
import { staffCostAnnual, tvAnnual, membershipFee, estimateRevenue, squadWageAnnual, divFactor } from './valuation';
import { PERSONALITIES } from './data/world';
import { addNews } from './news';

export const INCOME_CATS: LedgerCat[] = ['cuotas', 'entradas', 'tv', 'patrocinio', 'merchandising', 'premios', 'ventas', 'eventos', 'aportes', 'alquiler', 'prestamos_in'];
export const EXPENSE_CATS: LedgerCat[] = ['sueldos_jugadores', 'sueldos_empleados', 'cuerpo_tecnico', 'fichajes', 'comisiones', 'mantenimiento', 'seguridad', 'servicios', 'viajes', 'deuda', 'intereses', 'indemnizaciones', 'obras', 'multas', 'otros'];

export const CAT_LABEL: Record<LedgerCat, string> = {
  cuotas: 'Cuotas sociales', entradas: 'Venta de entradas', tv: 'Derechos televisivos', patrocinio: 'Patrocinadores', merchandising: 'Merchandising', premios: 'Premios deportivos', ventas: 'Venta de jugadores', eventos: 'Eventos', aportes: 'Aportes extraordinarios', alquiler: 'Alquiler de instalaciones', prestamos_in: 'Préstamos recibidos',
  sueldos_jugadores: 'Sueldos de jugadores', sueldos_empleados: 'Sueldos de empleados', cuerpo_tecnico: 'Cuerpo técnico', fichajes: 'Fichajes', comisiones: 'Comisiones', mantenimiento: 'Mantenimiento', seguridad: 'Seguridad', servicios: 'Servicios', viajes: 'Viajes', deuda: 'Amortización de deuda', intereses: 'Intereses', indemnizaciones: 'Indemnizaciones', obras: 'Obras', multas: 'Multas y sanciones', otros: 'Otros',
};

export function hasPerk(s: GameState, perk: string) {
  return PERSONALITIES.find((p) => p.id === s.president.personality)?.perks.includes(perk) ?? false;
}

/** Registra un movimiento en la caja de la institución que conduce el usuario. */
export function book(s: GameState, cat: LedgerCat, amount: number) {
  if (!amount) return;
  amount = Math.round(amount);
  const c = userClub(s);
  if (s.president.pos === 'club' && c) c.fin.cash += amount;
  else if (s.president.pos === 'asociacion') s.assoc.budget += amount;
  else if (s.president.pos === 'confederacion') s.confed.budget += amount;
  else if (s.president.pos === 'fifa') s.fifa.budget += amount;
  else return;
  s.ledger[cat] = (s.ledger[cat] ?? 0) + amount;
}

export function institutionCash(s: GameState): number {
  const c = userClub(s);
  if (s.president.pos === 'club' && c) return c.fin.cash;
  if (s.president.pos === 'asociacion') return s.assoc.budget;
  if (s.president.pos === 'confederacion') return s.confed.budget;
  if (s.president.pos === 'fifa') return s.fifa.budget;
  return 0;
}

export function totalDebt(s: GameState): number {
  const c = userClub(s);
  return s.loans.reduce((a, l) => a + l.balance, 0) + (c ? c.fin.payables + Math.max(0, -c.fin.cash) : 0);
}

export function sponsorAnnual(s: GameState) {
  return s.sponsors.reduce((a, x) => a + x.annual, 0);
}

export function memberCollection(s: GameState) {
  // porcentaje de socios que paga la cuota, depende del apoyo y del precio
  return clamp(0.55 + s.ind.socios / 250 - (s.economy.feeMult - 1) * 0.35, 0.35, 0.98);
}

/** Proyección anual (para el panel de finanzas). */
export function annualProjection(s: GameState) {
  const c = userClub(s);
  if (!c) return null;
  const mult = hasPerk(s, 'cost_minus') ? 0.9 : 1;
  const coach = c.coachId ? s.coaches[c.coachId] : null;
  const incomes = {
    cuotas: c.members * 1000 * membershipFee(c) * s.economy.feeMult * 12 * memberCollection(s),
    tv: tvAnnual(s, c),
    patrocinio: sponsorAnnual(s),
    merchandising: merchAnnual(s, c),
    eventos: c.facilities.social * 45_000 * divFactor(c.division) + c.facilities.museo * 25_000 * divFactor(c.division),
    entradas: gateEstimate(s, c),
  };
  const expenses = {
    sueldos_jugadores: squadWageAnnual(s, c.id),
    sueldos_empleados: staffCostAnnual(c) * mult * (s.economy.staffCost ?? 1),
    cuerpo_tecnico: (coach ? coach.wage * 12 * 1.6 : 0),
    mantenimiento: maintenanceAnnual(c) * mult,
    servicios: staffCostAnnual(c) * 0.05,
    intereses: s.loans.reduce((a, l) => a + l.balance * l.rate, 0),
  };
  const inc = Object.values(incomes).reduce((a, b) => a + b, 0);
  const exp = Object.values(expenses).reduce((a, b) => a + b, 0);
  return { incomes, expenses, inc, exp, net: inc - exp };
}

export function creditLine(s: GameState, c: Club) {
  return Math.round(estimateRevenue(s, c) * 0.05 * (s.ind.estabilidad >= 30 ? 1 : 0.4));
}

export function gateEstimate(s: GameState, c: Club) {
  const fill = clamp(0.28 + c.prestige / 230 + (s.ind.hinchas - 50) / 220 - (s.economy.ticketMult - 1) * 0.45, 0.12, 1);
  const price = (c.division === 1 ? 6 + c.prestige * 0.12 : c.division === 2 ? 4 + c.prestige * 0.08 : 3 + c.prestige * 0.07) * s.economy.ticketMult;
  const homes = c.division === 3 ? 15 : 17;
  return Math.round(c.stadium.capacity * fill * 0.55 * price * homes);
}

export function merchAnnual(s: GameState, c: Club) {
  const hinchas = s.president.clubId === c.id ? s.ind.hinchas : 55;
  return c.fanBase * 1000 * 0.7 * (1 + (c.facilities.tienda - 1) * 0.15) * (0.6 + hinchas / 125);
}

export function maintenanceAnnual(c: Club) {
  const fac = Object.values(c.facilities).reduce((a, b) => a + b, 0);
  return c.stadium.capacity * 6 + fac * 35_000 * divFactor(c.division);
}

/** Tic económico semanal del club del usuario. */
export function weeklyClubFinance(s: GameState, rng: RNG): { net: number; notes: string[] } {
  const c = userClub(s);
  const notes: string[] = [];
  if (!c || s.president.pos !== 'club') return { net: 0, notes };
  const before = c.fin.cash;
  const W = 40;
  const mult = hasPerk(s, 'cost_minus') ? 0.9 : 1;
  book(s, 'cuotas', (c.members * 1000 * membershipFee(c) * s.economy.feeMult * 12 * memberCollection(s)) / W);
  book(s, 'tv', tvAnnual(s, c) / W);
  for (const sp of s.sponsors) book(s, 'patrocinio', sp.annual / W);
  book(s, 'merchandising', merchAnnual(s, c) / W);
  book(s, 'eventos', (c.facilities.social * 45_000 * divFactor(c.division)) / W);
  book(s, 'alquiler', (c.facilities.museo * 25_000 * divFactor(c.division)) / W);

  const wagesFactor = s.economy.emergency ? 0.9 : 1;
  book(s, 'sueldos_jugadores', -(squadWageAnnual(s, c.id) * wagesFactor) / W);
  book(s, 'sueldos_empleados', -(staffCostAnnual(c) * mult * (s.economy.staffCost ?? 1)) / W);
  const coach = c.coachId ? s.coaches[c.coachId] : null;
  if (coach) book(s, 'cuerpo_tecnico', -(coach.wage * 12 * 1.6) / W);
  book(s, 'mantenimiento', -(maintenanceAnnual(c) * mult) / W);
  book(s, 'servicios', -(staffCostAnnual(c) * 0.05) / W);

  // Préstamos
  for (const l of s.loans) {
    const interest = (l.balance * l.rate) / W;
    const principal = Math.min(l.balance, l.payment - interest > 0 ? l.payment - interest : l.balance / Math.max(1, l.weeksLeft));
    book(s, 'intereses', -interest);
    book(s, 'deuda', -principal);
    l.balance = Math.max(0, l.balance - principal);
    l.weeksLeft--;
  }
  s.loans = s.loans.filter((l) => l.balance > 1 && l.weeksLeft > -20);
  // Descubierto
  if (c.fin.cash < 0) book(s, 'intereses', c.fin.cash * 0.006);
  // Obras
  progressProjects(s, rng, notes);

  // Atrasos salariales (nómina cada 4 semanas). Hay un descubierto bancario del 5% de los ingresos.
  if (s.week % 4 === 0) {
    if (c.fin.cash < -creditLine(s, c)) {
      c.fin.wageArrears++;
      notes.push(`Atraso salarial: ${c.fin.wageArrears} ${c.fin.wageArrears === 1 ? 'mes' : 'meses'} sin pagar sueldos completos.`);
      s.ind.jugadores = clamp(s.ind.jugadores - 4);
      s.ind.empleados = clamp(s.ind.empleados - 5);
    } else c.fin.wageArrears = 0;
  }
  s.cashHistory.push({ abs: (s.season - s.startSeason) * 40 + s.week, cash: c.fin.cash, debt: totalDebt(s) });
  if (s.cashHistory.length > 120) s.cashHistory.shift();
  return { net: c.fin.cash - before, notes };
}

/** Finanzas semanales de la asociación / confederación / FIF cuando las preside el usuario. */
export function weeklyBodyFinance(s: GameState) {
  const W = 40;
  if (s.president.pos === 'asociacion') {
    book(s, 'tv', (s.assoc.tvPool * 0.12) / W);
    book(s, 'patrocinio', 18_000_000 / W);
    book(s, 'sueldos_empleados', -9_000_000 / W);
    const co = s.nt.coachId ? s.coaches[s.nt.coachId] : null;
    if (co) book(s, 'cuerpo_tecnico', -(co.wage * 12 * 1.5) / W);
    book(s, 'obras', -(s.nt.youthInvest * 1_500_000) / W);
    book(s, 'mantenimiento', -(s.nt.facilities * 600_000) / W);
  } else if (s.president.pos === 'confederacion') {
    book(s, 'tv', 160_000_000 / W);
    book(s, 'patrocinio', 60_000_000 / W);
    book(s, 'sueldos_empleados', -40_000_000 / W);
    book(s, 'premios', -150_000_000 / W);
  } else if (s.president.pos === 'fifa') {
    book(s, 'tv', 1_400_000_000 / W);
    book(s, 'patrocinio', 600_000_000 / W);
    book(s, 'sueldos_empleados', -500_000_000 / W);
    book(s, 'premios', -(Number(s.flags.fifaDevelopment ?? 1) * 1_300_000_000) / W);
  }
}

/** Finanzas aproximadas de los clubes de la IA (para crisis, compras y ventas). */
export function weeklyAIFinance(s: GameState, rng: RNG) {
  const wages = new Map<string, number>();
  for (const p of Object.values(s.players)) if (p.clubId && !p.retired) wages.set(p.clubId, (wages.get(p.clubId) ?? 0) + p.wage * 12);
  for (const c of Object.values(s.clubs)) {
    if (c.division === 0 || c.id === s.president.clubId) continue;
    const rev = estimateRevenue(s, c);
    const staff = staffCostAnnual(c);
    const coach = c.coachId ? s.coaches[c.coachId] : null;
    const net = (rev - (wages.get(c.id) ?? 0) - staff - (coach ? coach.wage * 19 : 0) - c.fin.debt * 0.12) / 40;
    c.fin.cash += Math.round(net * rng.float(0.85, 1.15));
    if (s.week % 4 === 0) c.fin.wageArrears = c.fin.cash < -rev * 0.05 ? c.fin.wageArrears + 1 : 0;
  }
}

export function addPrize(s: GameState, clubId: string, amount: number, label: string) {
  const c = s.clubs[clubId];
  if (!c || c.division === 0) return;
  if (clubId === s.president.clubId && s.president.pos === 'club') {
    book(s, 'premios', amount);
    s.career.moneyGenerated += amount;
  } else c.fin.cash += amount;
  void label;
}

// ---------------------------------------------------------------------------
// Préstamos
// ---------------------------------------------------------------------------
export function loanOffer(s: GameState): { max: number; rate: number; weeks: number; lender: string } | null {
  const c = userClub(s);
  if (!c) return null;
  const rev = estimateRevenue(s, c);
  const stab = s.ind.estabilidad;
  const outstanding = s.loans.reduce((a, l) => a + l.balance, 0);
  let max = rev * 0.45 * (0.4 + stab / 100) - outstanding;
  if (stab < 15) max = 0;
  let rate = 0.09 + (100 - stab) / 450 + (s.settings.difficulty === 'dificil' ? 0.02 : s.settings.difficulty === 'leyenda' ? 0.04 : 0);
  if (hasPerk(s, 'loan_rate')) rate -= 0.03;
  const lender = stab > 60 ? 'Banco Austral' : stab > 35 ? 'Banco del Litoral' : 'Financiera Rápida del Sur';
  if (stab <= 35) rate += 0.08;
  return { max: Math.max(0, Math.round(max / 50_000) * 50_000), rate: Math.round(rate * 1000) / 1000, weeks: 80, lender };
}

export function takeLoan(s: GameState, amount: number): string {
  const off = loanOffer(s);
  if (!off || amount <= 0 || amount > off.max) return 'El banco rechazó la solicitud.';
  const totalInterest = amount * off.rate * (off.weeks / 40) * 0.55;
  const l: Loan = { id: newId(s, 'ln'), lender: off.lender, principal: amount, balance: amount, rate: off.rate, weeksLeft: off.weeks, payment: (amount + totalInterest) / off.weeks, takenSeason: s.season };
  s.loans.push(l);
  book(s, 'prestamos_in', amount);
  s.ind.estabilidad = clamp(s.ind.estabilidad - Math.min(8, (amount / Math.max(1, estimateRevenue(s, userClub(s)!))) * 25));
  s.ind.comision = clamp(s.ind.comision - 1);
  addNews(s, `El club toma un préstamo de ${money(amount)} con ${off.lender}`, 'neu', 'finanzas', true);
  return `Préstamo aprobado: ${money(amount)} al ${(off.rate * 100).toFixed(1)}% anual, a ${off.weeks} semanas.`;
}

export function refinance(s: GameState, loanId: string): string {
  const l = s.loans.find((x) => x.id === loanId);
  if (!l) return 'Préstamo inexistente.';
  if (s.ind.estabilidad < 10) return 'Ningún banco acepta refinanciar en estas condiciones.';
  l.weeksLeft += 60;
  l.rate = Math.round((l.rate + 0.025) * 1000) / 1000;
  const totalInterest = l.balance * l.rate * (l.weeksLeft / 40) * 0.55;
  l.payment = (l.balance + totalInterest) / l.weeksLeft;
  s.ind.estabilidad = clamp(s.ind.estabilidad + 3);
  s.ind.patrocinadores = clamp(s.ind.patrocinadores - 2);
  return `Deuda refinanciada: plazo extendido 60 semanas, nueva tasa ${(l.rate * 100).toFixed(1)}%. La cuota baja, pero el costo total sube.`;
}

export function prepayLoan(s: GameState, loanId: string, amount: number): string {
  const l = s.loans.find((x) => x.id === loanId);
  const c = userClub(s);
  if (!l || !c) return 'Préstamo inexistente.';
  const a = Math.min(amount, l.balance, c.fin.cash);
  if (a <= 0) return 'No hay caja suficiente.';
  book(s, 'deuda', -a);
  l.balance -= a;
  s.loans = s.loans.filter((x) => x.balance > 1);
  s.ind.estabilidad = clamp(s.ind.estabilidad + 2);
  return `Cancelaste ${money(a)} de deuda.`;
}

// ---------------------------------------------------------------------------
// Infraestructura
// ---------------------------------------------------------------------------
export const FACILITY_INFO: Record<FacilityKey, { name: string; desc: string; base: number; weeks: number }> = {
  estadio: { name: 'Estadio', desc: '+12% de capacidad por nivel, más recaudación y prestigio.', base: 3_500_000, weeks: 30 },
  entrenamiento: { name: 'Centro de entrenamiento', desc: 'Mejor desarrollo de jugadores y menos lesiones.', base: 1_400_000, weeks: 16 },
  juveniles: { name: 'Divisiones juveniles', desc: 'Juveniles de mayor calidad cada temporada.', base: 900_000, weeks: 14 },
  social: { name: 'Instalaciones sociales', desc: 'Más socios, eventos e ingresos sociales.', base: 800_000, weeks: 12 },
  tienda: { name: 'Tienda oficial', desc: '+15% de merchandising por nivel.', base: 400_000, weeks: 8 },
  museo: { name: 'Museo', desc: 'Prestigio, reputación e ingresos turísticos.', base: 500_000, weeks: 10 },
  medico: { name: 'Centro médico', desc: 'Menos lesiones y recuperaciones más rápidas.', base: 700_000, weeks: 10 },
  administracion: { name: 'Instalaciones administrativas', desc: 'Mejor relación con empleados y gestión más eficiente.', base: 450_000, weeks: 8 },
};

export function projectCost(c: Club, f: FacilityKey) {
  const lvl = c.facilities[f];
  const scale = c.division === 1 ? 1 : c.division === 2 ? 0.35 : 0.15;
  return Math.round((FACILITY_INFO[f].base * Math.pow(1.6, lvl - 1) * scale) / 10_000) * 10_000;
}

export function startProject(s: GameState, f: FacilityKey, financed: boolean): string {
  const c = userClub(s);
  if (!c) return 'Sin club.';
  if (c.facilities[f] >= 5) return 'La instalación ya está al máximo nivel.';
  if (s.projects.some((p) => p.facility === f)) return 'Ya hay una obra en curso en esa instalación.';
  const cost = projectCost(c, f);
  const upfront = financed ? cost * 0.1 : cost * 0.3;
  if (c.fin.cash < upfront) return `Se necesita un anticipo de ${money(upfront)}.`;
  book(s, 'obras', -upfront);
  const weeks = FACILITY_INFO[f].weeks;
  s.projects.push({ id: newId(s, 'pj'), facility: f, name: `${FACILITY_INFO[f].name} — nivel ${c.facilities[f] + 1}`, cost, paid: upfront, weeksTotal: weeks, weeksLeft: weeks, toLevel: c.facilities[f] + 1, startedAbs: (s.season - s.startSeason) * 40 + s.week, financed });
  if (financed) {
    s.loans.push({ id: newId(s, 'ln'), lender: 'Fideicomiso de obra', principal: cost * 0.6, balance: cost * 0.6, rate: 0.11, weeksLeft: 120, payment: (cost * 0.6 * 1.18) / 120, takenSeason: s.season });
  }
  s.ind.socios = clamp(s.ind.socios + 2);
  addNews(s, `${c.name} inicia obras: ${FACILITY_INFO[f].name.toLowerCase()}`, 'pos', 'obras', true);
  return `Obra iniciada. Costo total ${money(cost)}${financed ? ' (60% financiado con un fideicomiso)' : ''}. Duración estimada: ${weeks} semanas.`;
}

function progressProjects(s: GameState, rng: RNG, notes: string[]) {
  const c = userClub(s);
  if (!c) return;
  for (const p of s.projects) {
    const remainingShare = p.financed ? p.cost * 0.3 : p.cost * 0.7;
    const inst = remainingShare / p.weeksTotal;
    book(s, 'obras', -inst);
    p.paid += inst;
    p.weeksLeft--;
    if (p.weeksLeft <= 0) {
      c.facilities[p.facility] = p.toLevel;
      if (p.facility === 'estadio') c.stadium.capacity = Math.round(c.stadium.capacity * 1.12);
      if (p.facility === 'social') c.members = Math.round(c.members * 1.04);
      if (p.facility === 'museo') c.prestige = clamp(c.prestige + 1);
      s.ind.socios = clamp(s.ind.socios + 4);
      s.ind.hinchas = clamp(s.ind.hinchas + 3);
      s.ind.repNacional = clamp(s.ind.repNacional + 2);
      s.career.works.push(`${p.name} (${s.season})`);
      addNews(s, `Inauguración: ${c.name} estrena ${p.name.toLowerCase()}`, 'pos', 'obras', true);
      notes.push(`Obra finalizada: ${p.name}.`);
    }
  }
  s.projects = s.projects.filter((p) => p.weeksLeft > 0);
  void rng;
}

export function squadValue(s: GameState, clubId: string) {
  return squad(s, clubId).reduce((a, p) => a + p.value, 0);
}

export function balanceSheet(s: GameState) {
  const c = userClub(s);
  if (!c) return null;
  const stadium = c.stadium.capacity * 900 * (c.division === 1 ? 1 : 0.5);
  const facilities = Object.values(c.facilities).reduce((a, b) => a + b, 0) * 600_000 * divFactor(c.division);
  const players = squadValue(s, c.id) * 0.6; // valor contable conservador
  const cash = Math.max(0, c.fin.cash);
  const assets = stadium + facilities + players + cash;
  const loans = s.loans.reduce((a, l) => a + l.balance, 0);
  const liabilities = loans + c.fin.payables + Math.max(0, -c.fin.cash);
  return { stadium, facilities, players, cash, assets, loans, payables: c.fin.payables, overdraft: Math.max(0, -c.fin.cash), liabilities, equity: assets - liabilities };
}
