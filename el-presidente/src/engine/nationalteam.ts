// Gestión de la selección nacional (se desbloquea al presidir la AAF).
import type { GameState } from './types';
import type { RNG } from './rng';
import { clamp, money, absWeek } from './util';
import { book } from './economy';
import { changeInd, changeOpinion } from './relations';
import { addNews } from './news';
import { freeCoaches } from './coaches';
import { teamPower } from './match';
import { coachWage } from './valuation';

export function ntRating(s: GameState) {
  return Math.round(teamPower(s, 'ARG', false, true).rating * 10) / 10;
}

export function ntCallUps(s: GameState) {
  return teamPower(s, 'ARG', false, true).xi;
}

export function hireNTCoach(s: GameState, coachId: string): string {
  if (s.president.pos !== 'asociacion') return 'Sólo el presidente de la AAF elige al seleccionador.';
  const co = s.coaches[coachId];
  if (!co || co.clubId || co.nationalTeam) return 'Entrenador no disponible.';
  if (co.ability < 60) return `${co.name} no tiene el perfil para dirigir a la selección.`;
  if (s.nt.coachId) {
    const prev = s.coaches[s.nt.coachId];
    const pay = Math.round(prev.wage * 12 * 0.8);
    book(s, 'indemnizaciones', -pay);
    prev.nationalTeam = null;
    changeOpinion(s, prev.id, -20, 'Lo despidió de la selección');
  }
  co.nationalTeam = 'ARG';
  co.wage = Math.round(coachWage(co) * 1.6);
  co.contractEnd = s.season + 4;
  s.nt.coachId = co.id;
  changeOpinion(s, co.id, 20, 'Lo nombró seleccionador nacional');
  if (!co.tags.includes('seleccionador')) co.tags.push('seleccionador');
  changeInd(s, 'repNacional', co.popularity > 60 ? 3 : 0);
  addNews(s, `${co.name} es el nuevo seleccionador argentino`, 'pos', 'seleccion', true);
  return `${co.name} asume como seleccionador (${money(co.wage)}/mes).`;
}

export function fireNTCoach(s: GameState): string {
  if (s.president.pos !== 'asociacion' || !s.nt.coachId) return 'No hay seleccionador para despedir.';
  const prev = s.coaches[s.nt.coachId];
  const pay = Math.round(prev.wage * 12 * Math.max(0.5, prev.contractEnd - s.season) * 0.6);
  book(s, 'indemnizaciones', -pay);
  prev.nationalTeam = null;
  s.nt.coachId = null;
  changeOpinion(s, prev.id, -25, 'Lo echaron de la selección');
  changeInd(s, 'repNacional', -2);
  addNews(s, `La AAF despidió al seleccionador ${prev.name}`, 'neg', 'seleccion', true);
  return `${prev.name} fue desvinculado. Indemnización: ${money(pay)}. Elegí un reemplazo.`;
}

export function ntCandidates(s: GameState) {
  return freeCoaches(s).filter((c) => c.ability >= 62).slice(0, 12);
}

export function organizeFriendly(s: GameState, rng: RNG, nation: string): string {
  if (s.president.pos !== 'asociacion') return 'Sólo disponible como presidente de la AAF.';
  const last = s.president.lastActionAbs.friendly ?? -99;
  if (absWeek(s) - last < 6) return 'Ya se organizó un amistoso recientemente: los clubes se quejan por la cesión de jugadores.';
  s.president.lastActionAbs.friendly = absWeek(s);
  const opp = s.nations[nation];
  if (!opp) return '';
  const arg = ntRating(s);
  const diff = arg - opp.strength;
  const gf = rng.poisson(1.3 * Math.exp(diff * 0.05));
  const ga = rng.poisson(1.1 * Math.exp(-diff * 0.05));
  const income = Math.round(1_500_000 + opp.strength * 40_000);
  book(s, 'eventos', income);
  s.nt.morale = clamp(s.nt.morale + (gf > ga ? 5 : gf < ga ? -4 : 0));
  changeInd(s, 'presidentes', -1);
  s.nt.results.unshift({ season: s.season, comp: 'Amistoso', text: `Argentina ${gf}-${ga} ${opp.name}` });
  addNews(s, `Amistoso: Argentina ${gf}-${ga} ${opp.name}`, gf > ga ? 'pos' : gf < ga ? 'neg' : 'neu', 'seleccion', true);
  return `Argentina ${gf}-${ga} ${opp.name}. Ingresos por el amistoso: ${money(income)}.`;
}

export function setNTBonus(s: GameState, level: number): string {
  s.nt.bonus = level;
  s.nt.morale = clamp(s.nt.morale + level * 4);
  return level ? `Premio fijado: nivel ${level}. El plantel lo recibe con entusiasmo.` : 'Sin premios extra.';
}

export function setYouthInvestment(s: GameState, level: number): string {
  s.nt.youthInvest = level;
  changeInd(s, 'presidentes', level >= 2 ? 2 : 0);
  return `Inversión en selecciones juveniles: nivel ${level} (${money(level * 1_500_000)} por temporada).`;
}

export function upgradeNTFacilities(s: GameState): string {
  if (s.nt.facilities >= 5) return 'El predio de la selección ya es de primer nivel mundial.';
  const cost = 4_000_000 * s.nt.facilities;
  if (s.assoc.budget < cost) return `Se necesitan ${money(cost)}.`;
  book(s, 'obras', -cost);
  s.nt.facilities++;
  s.nt.morale = clamp(s.nt.morale + 4);
  changeInd(s, 'repInternacional', 2);
  return `Predio de la selección mejorado a nivel ${s.nt.facilities}.`;
}

/** Reacción a resultados de la selección (cuando un torneo termina para Argentina). */
export function ntTournamentOutcome(s: GameState, compName: string, stage: string, won: boolean) {
  const managing = s.president.pos === 'asociacion';
  s.nt.results.unshift({ season: s.season, comp: compName, text: won ? '¡Campeón!' : `Eliminada en ${stage}` });
  if (won) {
    addNews(s, `¡ARGENTINA CAMPEONA! Conquista la ${compName}`, 'pos', 'seleccion', managing);
    if (managing) {
      changeInd(s, 'repNacional', 12);
      changeInd(s, 'repInternacional', 10);
      changeInd(s, 'influencia', 8);
      s.career.titles.push({ season: s.season, comp: compName, club: 'Selección Argentina' });
    }
  } else {
    const big = compName.includes('Mundo');
    addNews(s, `Argentina quedó eliminada en ${stage} de la ${compName}`, 'neg', 'seleccion', managing);
    if (managing) {
      changeInd(s, 'repNacional', big ? -8 : -4);
      changeInd(s, 'presidentes', big ? -5 : -2);
      s.flags.ntFailureAbs = absWeek(s);
      s.flags.ntFailureBig = big;
    }
  }
}
