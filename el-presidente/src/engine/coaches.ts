// Entrenadores y cuerpo técnico: contratar, despedir, renovar, respaldar, exigir objetivos. IA de despidos.
import type { GameState, Coach, Club } from './types';
import type { RNG } from './rng';
import { clamp, money, absWeek } from './util';
import { userClub, positionOf } from './queries';
import { book } from './economy';
import { changeInd, changeOpinion, remember } from './relations';
import { addNews } from './news';
import { coachWage } from './valuation';
import { makeCoach } from './worldgen';

export function freeCoaches(s: GameState): Coach[] {
  return Object.values(s.coaches).filter((c) => !c.clubId && !c.nationalTeam && c.age < 75).sort((a, b) => b.ability - a.ability);
}

export function severance(s: GameState, co: Coach) {
  const years = Math.max(0.5, co.contractEnd - s.season + (40 - s.week) / 40);
  return Math.round(co.wage * 12 * years * 0.6);
}

export function coachAskFor(s: GameState, co: Coach, club: Club) {
  let w = co.wageDemand;
  if (club.division === 2) w *= 0.6;
  if (club.division === 3) w *= 0.35;
  return Math.round(w / 500) * 500;
}

export function willCoachJoin(s: GameState, co: Coach, club: Club): { ok: boolean; why?: string } {
  const lvl = 40 + club.prestige * 0.4 - (club.division - 1) * 6;
  if (co.ability > lvl + 18) return { ok: false, why: `${co.name} considera que el proyecto no está a su altura.` };
  if (co.opinion < -40) return { ok: false, why: `${co.name} no quiere trabajar con vos.` };
  return { ok: true };
}

export function fireCoach(s: GameState, rng: RNG, reason = 'decisión presidencial'): string {
  const c = userClub(s);
  if (!c || !c.coachId) return 'No hay entrenador para despedir.';
  const co = s.coaches[c.coachId];
  const pay = severance(s, co);
  book(s, 'indemnizaciones', -pay);
  co.clubId = null;
  co.confidence = 50;
  co.weeksInCharge = 0;
  changeOpinion(s, co.id, -25, `Te despidió (${reason})`);
  co.tags.push('despedido_por_usuario');
  s.flags.lastCoachFiredAbs = absWeek(s);
  c.coachId = null;
  changeInd(s, 'jugadores', co.squadRel > 70 ? -6 : -2);
  changeInd(s, 'hinchas', co.popularity > 65 ? -5 : 2);
  changeInd(s, 'dt', 0);
  s.flags.coachesFiredSeason = Number(s.flags.coachesFiredSeason ?? 0) + 1;
  if (Number(s.flags.coachesFiredSeason) >= 3) {
    changeInd(s, 'repNacional', -4);
    changeInd(s, 'comision', -4);
  }
  addNews(s, `${c.name} despidió a ${co.name}`, 'neg', 'entrenadores', true);
  // interino automático: ayudante de campo
  const interim = makeCoach(s, rng, Math.max(40, co.ability - 15), c.id);
  interim.name = `${interim.name} (interino)`;
  interim.contractEnd = s.season;
  interim.tags.push('interino');
  c.coachId = interim.id;
  return `${co.name} fue despedido. Indemnización: ${money(pay)}. Asume un interino mientras buscás reemplazo.`;
}

export function hireCoach(s: GameState, coachId: string, wage: number, years: number, rng: RNG): { ok: boolean; msg: string } {
  const c = userClub(s);
  const co = s.coaches[coachId];
  if (!c || !co || co.clubId) return { ok: false, msg: 'Entrenador no disponible.' };
  const j = willCoachJoin(s, co, c);
  if (!j.ok) return { ok: false, msg: j.why! };
  const ask = coachAskFor(s, co, c);
  if (wage < ask * 0.85 || !rng.chance(clamp((wage / ask - 0.85) / 0.2, 0.05, 1))) return { ok: false, msg: `${co.name} rechaza la oferta. Pretende ${money(ask)} mensuales.` };
  if (c.coachId) {
    const prev = s.coaches[c.coachId];
    if (prev.tags.includes('interino')) {
      prev.clubId = null;
      prev.age = 99; // los interinos vuelven a la estructura juvenil
    } else {
      const msg = fireCoach(s, rng, 'llegada de un nuevo DT');
      void msg;
      const interim = s.coaches[c.coachId!];
      if (interim) {
        interim.clubId = null;
        interim.age = 99;
      }
    }
  }
  co.clubId = c.id;
  co.wage = wage;
  co.contractEnd = s.season + years;
  co.confidence = 70;
  co.weeksInCharge = 0;
  co.opinion = clamp(co.opinion + 15, -100, 100);
  remember(s, co, `Lo contrataste para dirigir a ${c.name}`, 15);
  c.coachId = co.id;
  changeInd(s, 'hinchas', co.popularity > 65 ? 4 : 0);
  changeInd(s, 'jugadores', 1);
  addNews(s, `${co.name} es el nuevo entrenador de ${c.name}`, 'pos', 'entrenadores', true);
  return { ok: true, msg: `${co.name} firmó hasta ${co.contractEnd} por ${money(wage)} mensuales.` };
}

export function renewCoach(s: GameState, years: number, rng: RNG): string {
  const c = userClub(s);
  const co = c?.coachId ? s.coaches[c.coachId] : null;
  if (!c || !co) return 'Sin entrenador.';
  const ask = Math.max(co.wage, coachWage(co));
  if (co.opinion < -20 && rng.chance(0.6)) return `${co.name} prefiere no renovar por ahora.`;
  co.wage = Math.round(ask * 1.05);
  co.contractEnd = s.season + years;
  changeOpinion(s, co.id, 8, 'Le renovaste el contrato');
  changeInd(s, 'dt', 4);
  return `${co.name} renovó hasta ${co.contractEnd} (${money(co.wage)}/mes).`;
}

export function backCoach(s: GameState): string {
  const c = userClub(s);
  const co = c?.coachId ? s.coaches[c.coachId] : null;
  if (!c || !co) return 'Sin entrenador.';
  const key = 'backCoach';
  const last = s.president.lastActionAbs[key] ?? -99;
  if (absWeek(s) - last < 6) return 'Ya respaldaste públicamente al entrenador hace poco: repetirlo le quitaría valor.';
  s.president.lastActionAbs[key] = absWeek(s);
  co.confidence = clamp(co.confidence + 15);
  changeOpinion(s, co.id, 10, 'Lo respaldaste públicamente en un mal momento');
  if (!co.tags.includes('respaldado')) co.tags.push('respaldado');
  changeInd(s, 'dt', 5);
  const { pos, of } = positionOf(s, c.id);
  const bad = of && pos > of * 0.6;
  if (bad) {
    changeInd(s, 'hinchas', -2);
    s.flags.backedCoachAbs = absWeek(s);
    s.flags.backedCoachId = co.id;
  }
  addNews(s, `El presidente de ${c.name} ratificó a ${co.name}: "Confiamos plenamente en el proyecto"`, 'neu', 'entrenadores', true);
  return `Respaldo público a ${co.name}. Su confianza crece${bad ? ', pero parte de la hinchada no lo entiende' : ''}. Si los resultados no llegan, tu palabra quedará comprometida.`;
}

export function demandObjective(s: GameState, objective: string, rng: RNG): string {
  const c = userClub(s);
  const co = c?.coachId ? s.coaches[c.coachId] : null;
  if (!c || !co) return 'Sin entrenador.';
  s.flags.coachObjective = objective;
  s.flags.coachObjectiveSeason = s.season;
  if (co.personality === 'conflictivo' || rng.chance(0.25)) {
    changeOpinion(s, co.id, -8, 'Le exigiste objetivos públicamente');
    co.confidence = clamp(co.confidence - 5);
    return `${co.name} acepta el objetivo "${objective}", pero se siente presionado.`;
  }
  co.confidence = clamp(co.confidence + 3);
  changeInd(s, 'comision', 2);
  return `${co.name} asume el objetivo "${objective}". La comisión directiva valora la exigencia.`;
}

/** IA: los clubes rivales despiden y contratan entrenadores. */
export function aiCoachChanges(s: GameState, rng: RNG) {
  for (const c of Object.values(s.clubs)) {
    if (c.country !== 'ARG' || c.id === s.president.clubId) continue;
    const co = c.coachId ? s.coaches[c.coachId] : null;
    if (co) co.weeksInCharge++;
    const fire = !co || (co.confidence < 22 && co.weeksInCharge > 6 && rng.chance(0.35));
    if (!fire) continue;
    if (co) {
      co.clubId = null;
      co.confidence = 55;
      co.weeksInCharge = 0;
      addNews(s, `${c.name} despidió a ${co.name} tras la mala racha`, 'neg', 'entrenadores');
    }
    const lvl = 40 + c.prestige * 0.4 - (c.division - 1) * 6;
    const options = freeCoaches(s).filter((x) => x.ability <= lvl + 12);
    const pick = options[rng.int(0, Math.min(4, Math.max(0, options.length - 1)))] ?? makeCoach(s, rng, lvl, null);
    pick.clubId = c.id;
    pick.contractEnd = s.season + rng.int(1, 2);
    pick.wage = coachAskFor(s, pick, c);
    pick.confidence = 70;
    pick.weeksInCharge = 0;
    c.coachId = pick.id;
    if (c.division === 1) addNews(s, `${pick.name} asume como entrenador de ${c.name}`, 'neu', 'entrenadores');
  }
  // regenerar entrenadores libres
  if (freeCoaches(s).length < 12) makeCoach(s, rng, rng.int(45, 80), null);
}
