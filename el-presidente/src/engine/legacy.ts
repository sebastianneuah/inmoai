// Legado presidencial y biografía final.
import type { GameState } from './types';
import { clamp, money } from './util';
import { LEVEL_NAMES } from './queries';
import { PERSONALITIES } from './data/world';

export interface Legacy { parts: { key: string; label: string; value: number }[]; total: number; title: string; bio: string }

export function computeLegacy(s: GameState): Legacy {
  const c = s.career;
  const ind = s.ind;
  const sport = clamp(c.titles.length * 9 + c.promotions * 8 - c.relegations * 10 + ind.prestigio * 0.3, 0, 100);
  const econ = clamp(50 + c.moneyGenerated / 2_000_000 + (ind.estabilidad - 50) * 0.6 - c.sanctions.length * 4, 0, 100);
  const inst = clamp(c.works.length * 9 + (ind.gobernabilidad - 40) * 0.5 + c.electionsWon * 6, 0, 100);
  const pol = clamp(ind.influencia * 0.6 + c.peakLevel * 9, 0, 100);
  const integ = clamp(ind.integridad - c.sanctions.length * 8 - ind.riesgo * 0.2 + 10, 0, 100);
  const pop = clamp(ind.socios * 0.5 + ind.hinchas * 0.5, 0, 100);
  const intl = clamp(ind.repInternacional * 0.8 + (c.peakLevel >= 5 ? 20 : 0), 0, 100);
  const parts = [
    { key: 'sport', label: 'Éxito deportivo', value: Math.round(sport) },
    { key: 'econ', label: 'Estabilidad económica', value: Math.round(econ) },
    { key: 'inst', label: 'Crecimiento institucional', value: Math.round(inst) },
    { key: 'pol', label: 'Influencia política', value: Math.round(pol) },
    { key: 'integ', label: 'Integridad', value: Math.round(integ) },
    { key: 'pop', label: 'Popularidad', value: Math.round(pop) },
    { key: 'intl', label: 'Impacto internacional', value: Math.round(intl) },
  ];
  const total = Math.round(parts.reduce((a, p) => a + p.value, 0) / 0.7);
  const title = total >= 800 ? 'Leyenda del fútbol mundial' : total >= 650 ? 'Dirigente histórico' : total >= 500 ? 'Presidente respetado' : total >= 350 ? 'Gestión discreta' : total >= 200 ? 'Paso olvidable' : 'Una mancha en la historia';
  return { parts, total, title, bio: biography(s, total, title) };
}

export function biography(s: GameState, total: number, title: string): string {
  const p = s.president;
  const pers = PERSONALITIES.find((x) => x.id === p.personality)?.name.toLowerCase() ?? 'dirigente';
  const c = s.career;
  const clubs = c.clubs.map((x) => x.name);
  const uniq = [...new Set(clubs)];
  const parts: string[] = [];
  parts.push(`${p.name} ${p.surname} llegó a la dirigencia del fútbol argentino como ${pers}, con ${p.age - (s.season - s.startSeason)} años, para presidir ${uniq[0] ?? 'un club'} en ${s.startSeason}.`);
  if (uniq.length > 1) parts.push(`A lo largo de su carrera condujo ${uniq.length} instituciones: ${uniq.join(', ')}.`);
  if (c.titles.length) parts.push(`Celebró ${c.titles.length} ${c.titles.length === 1 ? 'título' : 'títulos'}, entre ellos ${c.titles.slice(0, 3).map((t) => `la ${t.comp} ${t.season}`).join(', ')}.`);
  else parts.push('Nunca pudo levantar un trofeo.');
  if (c.promotions) parts.push(`Festejó ${c.promotions} ${c.promotions === 1 ? 'ascenso' : 'ascensos'}.`);
  if (c.relegations) parts.push(`Cargó con ${c.relegations} ${c.relegations === 1 ? 'descenso' : 'descensos'}, una herida que sus críticos nunca olvidaron.`);
  if (c.works.length) parts.push(`Su gestión dejó obras como ${c.works.slice(0, 3).join(', ')}.`);
  if (c.moneyGenerated > 0) parts.push(`Generó ${money(c.moneyGenerated)} en ventas y premios para las instituciones que condujo.`);
  parts.push(`Ganó ${c.electionsWon} ${c.electionsWon === 1 ? 'elección' : 'elecciones'} y perdió ${c.electionsLost}.`);
  if (c.peakLevel >= 3) parts.push(`Su techo político fue el cargo de ${LEVEL_NAMES[c.peakLevel].toLowerCase()}.`);
  if (c.sanctions.length) parts.push(`Su nombre quedó asociado a ${c.sanctions.length} ${c.sanctions.length === 1 ? 'sanción' : 'sanciones'}.`);
  if (s.ind.integridad >= 70) parts.push('Se lo recuerda como un dirigente honesto en un ambiente difícil.');
  else if (s.ind.integridad <= 30) parts.push('La sombra de la sospecha acompañó cada uno de sus pasos.');
  parts.push(`Patrimonio personal al final de su carrera: ${money(p.wealth)}.`);
  parts.push(`Veredicto de la historia: ${title} (${total} puntos de legado).`);
  return parts.join(' ');
}
