// Aleatoriedad controlada (mulberry32). El estado del generador vive dentro del
// GameState para que una partida sea reproducible a partir de su semilla.
import type { GameState } from './types';

export interface RNG {
  next(): number;
  int(min: number, max: number): number; // inclusivo
  float(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (t: T) => number): T | undefined;
  shuffle<T>(arr: T[]): T[];
  normal(mean: number, sd: number): number;
  poisson(lambda: number): number;
}

export function mulberry(seedRef: { v: number }): RNG {
  const next = () => {
    let t = (seedRef.v = (seedRef.v + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r: RNG = {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted: (items, weight) => {
      let total = 0;
      const ws = items.map((i) => {
        const w = Math.max(0, weight(i));
        total += w;
        return w;
      });
      if (total <= 0) return undefined;
      let x = next() * total;
      for (let i = 0; i < items.length; i++) {
        x -= ws[i];
        if (x <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    shuffle: (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    normal: (mean, sd) => {
      const u = Math.max(1e-9, next());
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    poisson: (lambda) => {
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= next();
      } while (p > L && k < 15);
      return k - 1;
    },
  };
  return r;
}

/** RNG ligado al estado de la partida (avanza s.rng). */
export function rngOf(s: GameState): RNG {
  const ref = {
    get v() {
      return s.rng;
    },
    set v(x: number) {
      s.rng = x;
    },
  };
  return mulberry(ref as { v: number });
}
