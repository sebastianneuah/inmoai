import type { GameState, ID } from './types';
import { WEEKS_PER_SEASON } from './types';

export const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
export const round = (v: number, step = 1) => Math.round(v / step) * step;

export function absWeek(s: Pick<GameState, 'season' | 'week' | 'startSeason'>, season = s.season, week = s.week): number {
  return (season - s.startSeason) * WEEKS_PER_SEASON + week;
}
export function absToSW(s: Pick<GameState, 'startSeason'>, abs: number) {
  const season = s.startSeason + Math.floor((abs - 1) / WEEKS_PER_SEASON);
  const week = ((abs - 1) % WEEKS_PER_SEASON) + 1;
  return { season, week };
}

export function newId(s: GameState, prefix: string): ID {
  s.uid = (s.uid || 0) + 1;
  return `${prefix}${s.uid.toString(36)}`;
}

export function money(n: number, opts: { sign?: boolean; short?: boolean } = {}): string {
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  const a = Math.abs(n);
  let body: string;
  if (a >= 1_000_000_000) body = `${(a / 1_000_000_000).toFixed(2).replace('.', ',')} MM`;
  else if (a >= 1_000_000) body = `${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2).replace('.', ',')} M`;
  else if (a >= 1_000) body = `${Math.round(a / 1_000)} mil`;
  else body = `${Math.round(a)}`;
  return `${sign}USD ${body}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Fecha ficticia: la temporada arranca a mediados de enero; 40 semanas jugables. */
export function gameDate(season: number, week: number): string {
  const start = Date.UTC(season, 0, 12);
  const d = new Date(start + (week - 1) * 7 * 86400000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function pct(n: number) {
  return `${Math.round(n)}%`;
}

export function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}
export function avg(arr: number[]) {
  return arr.length ? sum(arr) / arr.length : 0;
}

export function ordinal(n: number) {
  return `${n}º`;
}

export function deepClone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}
