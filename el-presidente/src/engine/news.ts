// Periódico deportivo dinámico: los titulares se generan a partir de lo que sucede en la partida.
import type { GameState, NewsItem } from './types';
import type { RNG } from './rng';
import { newId } from './util';

export function addNews(s: GameState, headline: string, tone: NewsItem['tone'] = 'neu', tag?: string, mine = false, body?: string): NewsItem {
  const n: NewsItem = { id: newId(s, 'n'), season: s.season, week: s.week, headline, tone, tag, mine, body };
  s.news.unshift(n);
  if (s.news.length > 160) s.news.length = 160;
  return n;
}

export const PAPERS = ['La Tribuna Deportiva', 'Diario del Ascenso', 'El Despacho', 'Pasión & Poder', 'Crónica Futbolera'];

export function resultHeadline(rng: RNG, club: string, rival: string, gf: number, ga: number, home: boolean): { h: string; tone: NewsItem['tone'] } {
  const diff = gf - ga;
  if (diff >= 3) return { h: rng.pick([`Goleada histórica: ${club} aplastó ${gf}-${ga} a ${rival}`, `${club} pasó por encima de ${rival} y festeja un ${gf}-${ga}`, `Noche soñada: ${club} le hizo ${gf} a ${rival}`]), tone: 'pos' };
  if (diff > 0) return { h: rng.pick([`${club} venció ${gf}-${ga} a ${rival} ${home ? 'en casa' : 'como visitante'}`, `Triunfo trabajado de ${club} ante ${rival}`, `${club} sumó de a tres frente a ${rival}`]), tone: 'pos' };
  if (diff === 0) return { h: rng.pick([`${club} y ${rival} igualaron ${gf}-${ga}`, `Reparto de puntos entre ${club} y ${rival}`, `Empate con sabor a poco para ${club}`]), tone: 'neu' };
  if (diff <= -3) return { h: rng.pick([`Papelón: ${club} cayó ${gf}-${ga} ante ${rival}`, `Crisis: ${rival} goleó a ${club}`, `Noche negra para ${club}: ${gf}-${ga} contra ${rival}`]), tone: 'neg' };
  return { h: rng.pick([`${club} perdió ${gf}-${ga} con ${rival}`, `Golpe para ${club}: derrota ante ${rival}`, `${rival} se impuso a ${club}`]), tone: 'neg' };
}
