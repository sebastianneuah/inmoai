// Acciones presidenciales directas (fuera de los acontecimientos): economía, institución, prensa.
import type { GameState } from './types';
import type { RNG } from './rng';
import { clamp, money, absWeek } from './util';
import { userClub } from './queries';
import { book } from './economy';
import { changeInd, changeOpinion } from './relations';
import { addNews } from './news';
import { estimateRevenue } from './valuation';
import { triggerEvent } from './events';
import { spendCapital } from './politics';

function cooldown(s: GameState, key: string, weeks: number): string | null {
  const last = s.president.lastActionAbs[key];
  if (last !== undefined && absWeek(s) - last < weeks) return `Disponible en ${weeks - (absWeek(s) - last)} semanas.`;
  return null;
}
function mark(s: GameState, key: string) {
  s.president.lastActionAbs[key] = absWeek(s);
}

export function actionCooldown(s: GameState, key: string, weeks: number) {
  return cooldown(s, key, weeks);
}

export function setTicketMult(s: GameState, v: number): string {
  const prev = s.economy.ticketMult;
  s.economy.ticketMult = clamp(Math.round(v * 100) / 100, 0.5, 2.5);
  const d = s.economy.ticketMult - prev;
  changeInd(s, 'hinchas', -d * 12);
  if (d > 0.2) addNews(s, `Polémica: ${userClub(s)?.name} aumenta el precio de las entradas`, 'neg', 'finanzas', true);
  return `Precio de entradas fijado en ${Math.round(s.economy.ticketMult * 100)}% del valor base.`;
}

export function setFeeMult(s: GameState, v: number): string {
  const prev = s.economy.feeMult;
  s.economy.feeMult = clamp(Math.round(v * 100) / 100, 0.5, 2.5);
  const d = s.economy.feeMult - prev;
  changeInd(s, 'socios', -d * 14);
  return `Cuota social fijada en ${Math.round(s.economy.feeMult * 100)}% del valor base.`;
}

export function setTransferBudget(s: GameState, v: number) {
  s.economy.transferBudget = Math.max(0, Math.round(v / 10_000) * 10_000);
  return `Presupuesto de fichajes: ${money(s.economy.transferBudget)}.`;
}
export function setWageCap(s: GameState, v: number) {
  s.economy.wageCap = Math.max(0, Math.round(v / 100) * 100);
  if (v > 0) changeInd(s, 'representantes', -2);
  return v > 0 ? `Tope salarial: ${money(s.economy.wageCap)} mensuales por jugador.` : 'Sin tope salarial.';
}

export function toggleEmergency(s: GameState): string {
  if (s.economy.emergency) {
    s.economy.emergency = false;
    changeInd(s, 'jugadores', 3);
    return 'Levantaste la emergencia económica.';
  }
  const cd = cooldown(s, 'emergencia', 30);
  if (cd) return `No podés volver a declarar la emergencia todavía. ${cd}`;
  mark(s, 'emergencia');
  s.economy.emergency = true;
  s.economy.emergencyAbs = absWeek(s);
  changeInd(s, 'jugadores', -8);
  changeInd(s, 'empleados', -6);
  changeInd(s, 'socios', -3);
  changeInd(s, 'patrocinadores', -3);
  changeInd(s, 'estabilidad', 5);
  addNews(s, `${userClub(s)?.name} declara la emergencia económica`, 'neg', 'finanzas', true);
  return 'Emergencia económica declarada: sueldos de jugadores −10%, sin aumentos ni renovaciones al alza. El plantel y los empleados lo reciben mal.';
}

export function reduceCosts(s: GameState): string {
  const cd = cooldown(s, 'recorte', 20);
  if (cd) return cd;
  mark(s, 'recorte');
  s.economy.staffCost = Math.max(0.6, Math.round((s.economy.staffCost ?? 1) * 0.9 * 100) / 100);
  changeInd(s, 'empleados', -9);
  changeInd(s, 'gobernabilidad', -2);
  changeInd(s, 'estabilidad', 3);
  return 'Recortaste un 10% la estructura de empleados. El gremio advierte medidas de fuerza.';
}

export function sellAsset(s: GameState): string {
  const c = userClub(s);
  if (!c) return '';
  const cd = cooldown(s, 'activo', 40);
  if (cd) return `Ya vendiste un activo esta temporada. ${cd}`;
  mark(s, 'activo');
  const v = Math.round(estimateRevenue(s, c) * 0.09);
  book(s, 'ventas', v);
  changeInd(s, 'socios', -6);
  changeInd(s, 'hinchas', -2);
  c.facilities.social = Math.max(1, c.facilities.social - 1);
  addNews(s, `${c.name} vende un predio por ${money(v)}: malestar entre los socios`, 'neg', 'finanzas', true);
  return `Vendiste un predio del club por ${money(v)}. Las instalaciones sociales pierden un nivel.`;
}

export function seekInvestors(s: GameState, rng: RNG): string {
  const cd = cooldown(s, 'inversores', 30);
  if (cd) return cd;
  mark(s, 'inversores');
  const ev = triggerEvent(s, rng, 'fin_inversor_sad');
  return ev ? 'Un fondo de inversión respondió a tu convocatoria: revisá la bandeja de decisiones.' : 'Ningún inversor mostró interés por ahora.';
}

export function approveBudget(s: GameState): string {
  if (s.economy.budgetApproved === s.season) return 'El presupuesto de esta temporada ya fue aprobado.';
  const ok = s.ind.comision >= 45 || (s.ind.comision >= 35 && s.ind.socios >= 55);
  if (ok) {
    s.economy.budgetApproved = s.season;
    changeInd(s, 'gobernabilidad', 5);
    changeInd(s, 'estabilidad', 2);
    return 'La comisión directiva aprobó el presupuesto anual. Gobernabilidad reforzada.';
  }
  changeInd(s, 'comision', -3);
  changeInd(s, 'gobernabilidad', -3);
  return 'La comisión directiva rechazó el presupuesto. Necesitás mejorar la relación con los dirigentes.';
}

export function publishBalance(s: GameState): string {
  const cd = cooldown(s, 'balance', 12);
  if (cd) return cd;
  mark(s, 'balance');
  s.flags.balancePublishedAbs = absWeek(s);
  const good = s.ind.estabilidad >= 50;
  changeInd(s, 'integridad', 4);
  changeInd(s, 'riesgo', -3);
  changeInd(s, 'socios', good ? 3 : -3);
  changeInd(s, 'patrocinadores', good ? 2 : -2);
  return good ? 'Publicaste el balance: los números ordenados generan confianza.' : 'Publicaste el balance: la transparencia se valora, pero los números preocupan.';
}

export function meetMembers(s: GameState, rng: RNG): string {
  const cd = cooldown(s, 'socios', 6);
  if (cd) return cd;
  mark(s, 'socios');
  const d = rng.int(1, 5) + (s.ind.integridad > 60 ? 1 : 0);
  changeInd(s, 'socios', d);
  const c = userClub(s);
  if (c?.staff?.lider_socios) changeOpinion(s, c.staff.lider_socios, 4, 'Reunión con los socios');
  if (c?.staff?.opositor) changeOpinion(s, c.staff.opositor, 1);
  return `Reunión abierta con los socios: escuchaste reclamos y propuestas (+${d} apoyo).`;
}

export function meetBarra(s: GameState): string {
  const cd = cooldown(s, 'barra', 8);
  if (cd) return cd;
  mark(s, 'barra');
  const c = userClub(s);
  changeInd(s, 'barra', 6);
  changeInd(s, 'integridad', -2);
  changeInd(s, 'riesgo', 2);
  if (c?.staff?.lider_barra) changeOpinion(s, c.staff.lider_barra, 8, 'Reunión con la dirigencia');
  return 'Te reuniste con los referentes de la barra. Bajó la tensión, pero el vínculo deja marcas.';
}

export function setSecurity(s: GameState, level: number): string {
  s.economy.securityLevel = clamp(level, 0.6, 2);
  if (level > 1.2) {
    changeInd(s, 'barra', -3);
    changeInd(s, 'integridad', 1);
  }
  return `Nivel de seguridad en partidos: ${Math.round(s.economy.securityLevel * 100)}%.`;
}

export function transparencyPolicy(s: GameState): string {
  if (s.flags.transparencia) return 'La política de transparencia ya está vigente.';
  s.flags.transparencia = true;
  changeInd(s, 'integridad', 8);
  changeInd(s, 'riesgo', -6);
  changeInd(s, 'representantes', -5);
  changeInd(s, 'socios', 3);
  addNews(s, `${userClub(s)?.name ?? 'La institución'} adopta una política de transparencia total`, 'pos', 'institucional', true);
  return 'Política de transparencia adoptada: contratos y balances serán públicos. Algunos representantes no lo ven con buenos ojos.';
}

export const STATEMENTS: { id: string; label: string; apply: (s: GameState) => string }[] = [
  { id: 'calma', label: 'Llevar calma: "Estamos trabajando con seriedad"', apply: (s) => { changeInd(s, 'periodistas', 1); return 'Mensaje de calma bien recibido.'; } },
  { id: 'arbitros', label: 'Apuntar contra los árbitros', apply: (s) => { changeInd(s, 'hinchas', 3); changeInd(s, 'asociacion', -4); if (s.assoc.presidentId) changeOpinion(s, s.assoc.presidentId, -5, 'Criticó el arbitraje'); return 'Los hinchas te aplauden; la asociación toma nota.'; } },
  { id: 'ambicion', label: 'Ambición: "Este club nació para ganar"', apply: (s) => { changeInd(s, 'hinchas', 3); changeInd(s, 'socios', 1); s.flags.ambitiousStatementAbs = absWeek(s); return 'Generaste expectativas altas.'; } },
  { id: 'autocritica', label: 'Autocrítica sincera', apply: (s) => { changeInd(s, 'integridad', 2); changeInd(s, 'periodistas', 2); changeInd(s, 'hinchas', -1); return 'Tu honestidad suma credibilidad.'; } },
  { id: 'asociacion', label: 'Elogiar a la conducción de la asociación', apply: (s) => { changeInd(s, 'asociacion', 3); changeInd(s, 'presidentes', -1); if (s.assoc.presidentId) changeOpinion(s, s.assoc.presidentId, 5, 'Lo elogió en público'); return 'La asociación valora tu gesto.'; } },
  { id: 'oposicion', label: 'Atacar a la oposición', apply: (s) => { changeInd(s, 'gobernabilidad', -1); const c = userClub(s); if (c?.staff?.opositor) changeOpinion(s, c.staff.opositor, -10, 'Lo atacó públicamente'); return 'La interna se recalienta.'; } },
];

export function giveInterview(s: GameState, statementId: string): string {
  const cd = cooldown(s, 'entrevista', 3);
  if (cd) return `Ya diste una entrevista hace poco. ${cd}`;
  const st = STATEMENTS.find((x) => x.id === statementId);
  if (!st) return '';
  mark(s, 'entrevista');
  const r = st.apply(s);
  addNews(s, `${s.president.surname}: ${st.label.replace(/^[^:]+: /, '')}`, 'neu', 'prensa', true);
  return r;
}

export function politicalCapitalCost(s: GameState, n: number) {
  return spendCapital(s, n);
}
