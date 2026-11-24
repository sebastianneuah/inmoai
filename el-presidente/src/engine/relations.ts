// Sistema de personajes, relaciones e indicadores dinámicos.
import type { GameState, IndKey, Indicators, Character, Coach } from './types';
import { IND_KEYS } from './types';
import { clamp, avg } from './util';
import { userClub, squad, positionOf, charsByRole, careerLevel } from './queries';
import { estimateRevenue } from './valuation';
import { totalDebt } from './economy';

export const IND_INFO: Record<IndKey, { name: string; short: string; group: string; inverse?: boolean; desc: string }> = {
  socios: { name: 'Apoyo de los socios', short: 'Socios', group: 'Base social', desc: 'Define elecciones, cobro de cuotas y protestas.' },
  hinchas: { name: 'Apoyo de los hinchas', short: 'Hinchas', group: 'Base social', desc: 'Asistencia, merchandising y presión ambiental.' },
  barra: { name: 'Relación con la barra brava', short: 'Barra', group: 'Base social', desc: 'Muy baja: violencia. Muy alta: exigencias y riesgo judicial.' },
  patrocinadores: { name: 'Confianza de los patrocinadores', short: 'Sponsors', group: 'Economía', desc: 'Renovaciones, nuevas ofertas y abandonos.' },
  jugadores: { name: 'Apoyo de los jugadores', short: 'Plantel', group: 'Deportivo', desc: 'Afecta el rendimiento y los conflictos internos.' },
  dt: { name: 'Relación con el director técnico', short: 'DT', group: 'Deportivo', desc: 'Rendimiento del equipo y estabilidad del cuerpo técnico.' },
  comision: { name: 'Apoyo de la comisión directiva', short: 'Comisión', group: 'Institucional', desc: 'Si cae demasiado, intentarán destituirte.' },
  empleados: { name: 'Relación con los empleados', short: 'Empleados', group: 'Institucional', desc: 'Conflictos gremiales y funcionamiento del club.' },
  asociacion: { name: 'Relación con la asociación nacional', short: 'Asociación', group: 'Política', desc: 'Oportunidades políticas y trato en sanciones.' },
  presidentes: { name: 'Relación con otros presidentes', short: 'Presidentes', group: 'Política', desc: 'Votos en asambleas y elecciones de la asociación.' },
  representantes: { name: 'Relación con representantes', short: 'Agentes', group: 'Deportivo', desc: 'Precios y disponibilidad en el mercado.' },
  periodistas: { name: 'Relación con periodistas', short: 'Prensa', group: 'Imagen', desc: 'Tono de las noticias y opinión pública.' },
  influencia: { name: 'Influencia política', short: 'Influencia', group: 'Política', desc: 'Acceso a cargos y capacidad de imponer agenda.' },
  repNacional: { name: 'Reputación nacional', short: 'Rep. nac.', group: 'Imagen', desc: 'Ofertas de clubes grandes y patrocinadores.' },
  repInternacional: { name: 'Reputación internacional', short: 'Rep. int.', group: 'Imagen', desc: 'Llave para la confederación y la FIF.' },
  integridad: { name: 'Integridad institucional', short: 'Integridad', group: 'Imagen', desc: 'Protege de escándalos y sanciones.' },
  riesgo: { name: 'Riesgo de investigación', short: 'Riesgo', group: 'Imagen', inverse: true, desc: 'Alto: auditorías, sanciones y suspensiones.' },
  estabilidad: { name: 'Estabilidad financiera', short: 'Finanzas', group: 'Economía', desc: 'Crédito, patrocinios y tranquilidad institucional.' },
  prestigio: { name: 'Prestigio deportivo', short: 'Prestigio', group: 'Deportivo', desc: 'Resultados, títulos y atractivo para jugadores.' },
  gobernabilidad: { name: 'Gobernabilidad', short: 'Gobierno', group: 'Institucional', desc: 'Capacidad real de gobernar la institución.' },
};

export function changeInd(s: GameState, k: IndKey, d: number) {
  s.ind[k] = clamp(Math.round((s.ind[k] + d) * 10) / 10);
}

export function applyInd(s: GameState, delta: Partial<Indicators>) {
  for (const [k, v] of Object.entries(delta)) if (v) changeInd(s, k as IndKey, v);
}

export function remember(s: GameState, target: Character | Coach, text: string, d: number) {
  target.memory.push({ s: s.season, w: s.week, t: text, d });
  if (target.memory.length > 25) target.memory.shift();
}

export function changeOpinion(s: GameState, id: string | undefined | null, d: number, memo?: string) {
  if (!id) return;
  const ch = s.chars[id] ?? s.coaches[id];
  if (!ch) return;
  // los leales perdonan más, los conflictivos recuerdan más lo negativo
  let delta = d;
  if ('personality' in ch) {
    const p = (ch as Character).personality;
    if (d < 0 && p === 'leal') delta *= 0.7;
    if (d < 0 && (p === 'conflictivo' || p === 'ambicioso')) delta *= 1.3;
    if (d > 0 && p === 'oportunista') delta *= 1.2;
  }
  ch.opinion = clamp(Math.round(ch.opinion + delta), -100, 100);
  if ('trust' in ch) (ch as Character).trust = clamp((ch as Character).trust + delta * 0.3);
  if (memo) remember(s, ch, memo, Math.round(delta));
}

export function opinionLabel(o: number): string {
  if (o >= 60) return 'Aliado incondicional';
  if (o >= 30) return 'Favorable';
  if (o >= 8) return 'Cordial';
  if (o > -8) return 'Neutral';
  if (o > -30) return 'Distante';
  if (o > -60) return 'Hostil';
  return 'Enemigo declarado';
}

/** Actualización semanal: los indicadores derivados tienden a su valor "real". */
export function weeklyIndicators(s: GameState) {
  const c = userClub(s);
  const ind = s.ind;
  const drift = (k: IndKey, target: number, rate: number) => {
    ind[k] = clamp(Math.round((ind[k] + (target - ind[k]) * rate) * 10) / 10);
  };
  if (c && s.president.pos === 'club') {
    const rev = estimateRevenue(s, c) || 1;
    const debt = totalDebt(s);
    const cashRatio = c.fin.cash / rev;
    const finTarget = clamp(55 + cashRatio * 120 - (debt / rev) * 60 - c.fin.wageArrears * 12);
    drift('estabilidad', finTarget, 0.12);
    const { pos, of } = positionOf(s, c.id);
    const form = c.form.slice(-6);
    const formScore = form.length ? (form.filter((x) => x === 'G').length * 3 + form.filter((x) => x === 'E').length) / (form.length * 3) : 0.45;
    const tablePct = of ? 1 - (pos - 1) / Math.max(1, of - 1) : 0.5;
    const expected = clamp((c.prestige - 30) / 65, 0, 1); // lo que los hinchas esperan
    const sportTarget = clamp(30 + formScore * 35 + tablePct * 25 + (c.division === 1 ? 10 : c.division === 2 ? 0 : -10));
    drift('prestigio', sportTarget, 0.08);
    const perf = formScore * 0.6 + tablePct * 0.4 - expected * 0.5 + 0.25; // ~0..1
    drift('hinchas', clamp(30 + perf * 55 + (ind.periodistas - 50) * 0.1), 0.06);
    drift('socios', clamp(ind.socios * 0.7 + (30 + perf * 45 + (ind.estabilidad - 50) * 0.15 + (ind.integridad - 50) * 0.1) * 0.3), 0.08);
    // plantel: moral promedio y atrasos
    const sq = squad(s, c.id);
    const morale = avg(sq.map((p) => p.morale));
    drift('jugadores', clamp(morale - c.fin.wageArrears * 8), 0.07);
    const coach = c.coachId ? s.coaches[c.coachId] : null;
    if (coach) drift('dt', clamp(50 + coach.opinion * 0.5), 0.1);
    // comisión: promedio de opinión de la directiva
    const board = [c.staff?.vicepresidente, c.staff?.tesorero, ...(c.staff?.vocales ?? [])].filter(Boolean).map((id) => s.chars[id!]).filter(Boolean);
    if (board.length) drift('comision', clamp(50 + avg(board.map((b) => b.opinion)) * 0.6 + (ind.socios - 50) * 0.2), 0.05);
    const barra = c.staff?.lider_barra ? s.chars[c.staff.lider_barra] : null;
    if (barra) drift('barra', clamp(50 + barra.opinion * 0.5), 0.05);
    drift('empleados', clamp(ind.empleados + (c.fin.wageArrears ? -2 : 0.3)), 1);
  } else {
    drift('estabilidad', clamp(50 + (institutionBudgetRatio(s) - 0.5) * 60), 0.08);
  }
  // Política: presidentes y asociación
  const prs = charsByRole(s, 'presidente_club');
  if (prs.length) drift('presidentes', clamp(50 + avg(prs.map((p) => p.opinion)) * 0.8), 0.06);
  const ap = s.assoc.presidentId ? s.chars[s.assoc.presidentId] : null;
  if (ap) drift('asociacion', clamp(50 + ap.opinion * 0.6), 0.05);
  const journalists = charsByRole(s, 'periodista');
  if (journalists.length) drift('periodistas', clamp(50 + avg(journalists.map((p) => p.opinion)) * 0.7), 0.06);
  const agents = charsByRole(s, 'representante');
  if (agents.length) drift('representantes', clamp(50 + avg(agents.map((p) => p.opinion)) * 0.7), 0.05);
  // la influencia se erosiona si no se sostiene con cargos y aliados
  const allies = Object.values(s.chars).filter((c) => c.active && c.tags.includes('aliado_usuario')).length;
  drift('influencia', clamp(22 + careerLevel(s) * 11 + allies * 1.5 + (s.president.committee ? 6 : 0)), 0.015);
  // integridad vs riesgo: el riesgo baja lentamente si la integridad es alta
  drift('riesgo', clamp(ind.riesgo - (ind.integridad - 50) * 0.03), 1);
  // gobernabilidad derivada
  const govTarget = clamp(ind.comision * 0.35 + ind.socios * 0.25 + ind.empleados * 0.15 + ind.estabilidad * 0.15 + (100 - ind.riesgo) * 0.1);
  drift('gobernabilidad', govTarget, 0.15);
  // reputación nacional: prestigio, integridad, prensa, influencia
  drift('repNacional', clamp(ind.prestigio * 0.35 + ind.integridad * 0.2 + ind.periodistas * 0.2 + ind.influencia * 0.25), 0.03);
  drift('repInternacional', clamp(ind.repInternacional), 1);

  if (s.week % 4 === 0) {
    s.indHistory.push({ abs: (s.season - s.startSeason) * 40 + s.week, v: { ...ind } });
    if (s.indHistory.length > 80) s.indHistory.shift();
  }
}

function institutionBudgetRatio(s: GameState) {
  const b = s.president.pos === 'asociacion' ? s.assoc.budget / 80_000_000 : s.president.pos === 'confederacion' ? s.confed.budget / 400_000_000 : s.fifa.budget / 6_000_000_000;
  return clamp(b, 0, 1);
}

export function snapshotInd(s: GameState): Indicators {
  const o = {} as Indicators;
  for (const k of IND_KEYS) o[k] = s.ind[k];
  return o;
}
