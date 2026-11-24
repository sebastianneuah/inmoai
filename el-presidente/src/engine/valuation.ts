// Fórmulas de valor de mercado, salarios y economía base de los clubes.
import type { Club, Player, GameState, Coach } from './types';
import { clamp } from './util';

export function playerValue(p: Pick<Player, 'ovr' | 'age' | 'pot'>, contractLeft = 3): number {
  let v = 25_000 * Math.exp((p.ovr - 45) * 0.15);
  if (p.age <= 21) v *= 1 + Math.max(0, p.pot - p.ovr) * 0.07;
  else if (p.age <= 24) v *= 1 + Math.max(0, p.pot - p.ovr) * 0.04;
  else if (p.age >= 34) v *= 0.25;
  else if (p.age >= 31) v *= 0.55;
  else if (p.age >= 29) v *= 0.8;
  if (contractLeft <= 0) v *= 0.35;
  else if (contractLeft === 1) v *= 0.7;
  return Math.max(10_000, Math.round(v / 10_000) * 10_000);
}

export function clubWageFactor(c: Club): number {
  if (c.division === 0) return 2.5;
  if (c.division === 1) return 0.5 + c.prestige / 75;
  if (c.division === 2) return 0.8;
  return 0.55;
}

export function baseWage(ovr: number): number {
  return 1000 * Math.exp((ovr - 45) * 0.12);
}

export function wageFor(p: Pick<Player, 'ovr' | 'age' | 'popularity'>, c: Club): number {
  const w = baseWage(p.ovr) * clubWageFactor(c) * (1 + (p.popularity - 50) / 250) * (p.age >= 33 ? 0.8 : 1);
  return Math.max(c.division === 3 ? 500 : 800, Math.round(w / 100) * 100);
}

export function coachWage(co: Pick<Coach, 'ability' | 'experience' | 'popularity'>): number {
  return Math.round((3000 * Math.exp((co.ability - 40) * 0.07) * (0.8 + co.experience / 250)) / 500) * 500;
}

export function divFactor(div: number) {
  return div === 1 ? 1 : div === 2 ? 0.35 : div === 3 ? 0.12 : 2;
}

export function staffCostAnnual(c: Club): number {
  const base = c.division === 1 ? 400_000 : c.division === 2 ? 150_000 : 50_000;
  return Math.round(base + Math.pow(c.prestige / 100, 3) * 11_000_000 * divFactor(c.division) * (1 + (c.facilities.administracion - 1) * 0.05));
}

export function ticketBase(c: Club): number {
  if (c.division === 1) return 6 + c.prestige * 0.12;
  if (c.division === 2) return 4 + c.prestige * 0.08;
  return 3 + c.prestige * 0.07;
}

export function tvAnnual(s: GameState, c: Club): number {
  if (c.division === 2) return 650_000;
  if (c.division === 3) return 210_000;
  if (c.division !== 1) return 0;
  const pool = s.assoc.tvPool;
  const n = 18;
  const equal = pool / n;
  const clubs = Object.values(s.clubs).filter((x) => x.division === 1);
  const totalPrestige = clubs.reduce((a, x) => a + Math.pow(x.prestige, 2), 0) || 1;
  const merit = (pool * Math.pow(c.prestige, 2)) / totalPrestige;
  const m = s.assoc.tvModel === 'equitativo' ? 0 : s.assoc.tvModel === 'mixto' ? 0.5 : 0.85;
  return Math.round(equal * (1 - m) + merit * m);
}

export function membershipFee(c: Club) {
  return c.division === 1 ? 5 : c.division === 2 ? 4 : 3;
}

/** Ingreso anual estimado (para IA y proyecciones). */
export function estimateRevenue(s: GameState, c: Club): number {
  const cuotas = c.members * 1000 * membershipFee(c) * 12 * 0.9;
  const fill = clamp(0.35 + c.prestige / 200, 0.3, 0.95);
  const entradas = c.stadium.capacity * fill * ticketBase(c) * 17 * 0.6;
  const tv = tvAnnual(s, c);
  const sponsors = c.sponsorIncome ?? sponsorPotential(c);
  const merch = c.fanBase * 1000 * 0.7 * (1 + (c.facilities.tienda - 1) * 0.15);
  return Math.round(cuotas + entradas + tv + sponsors + merch);
}

export function sponsorPotential(c: Club): number {
  const base = c.division === 1 ? 600_000 + Math.pow(c.prestige / 100, 3) * 16_000_000 : c.division === 2 ? 250_000 + c.prestige * 6000 : 60_000 + c.prestige * 2000;
  return Math.round(base);
}

export function squadWageAnnual(s: GameState, clubId: string): number {
  let t = 0;
  for (const p of Object.values(s.players)) if (p.clubId === clubId && !p.retired) t += p.wage * 12;
  return t;
}
