// Sistema de guardado. La interfaz SaveRepository permite reemplazar el almacenamiento
// local por una base de datos con cuentas de usuario sin tocar el resto del juego.
import LZString from 'lz-string';
import type { GameState } from './types';
import { careerLevel, LEVEL_NAMES, userClub } from './queries';
import { computeLegacy } from './legacy';

export interface SaveMeta { id: string; name: string; president: string; club: string | null; position: string; season: number; week: number; updatedAt: number; level: number }
export interface CareerHistoryEntry { id: string; president: string; seasons: string; endedAt: number; legacy: number; titles: number; peak: string; bio: string; reason: string }

export interface SaveRepository {
  list(): SaveMeta[];
  load(id: string): GameState | null;
  save(s: GameState): void;
  remove(id: string): void;
  lastPlayed(): string | null;
  history(): CareerHistoryEntry[];
  addHistory(e: CareerHistoryEntry): void;
}

const PREFIX = 'elpresidente:';
const memory = new Map<string, string>();
const storage = {
  get(k: string): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : memory.get(k) ?? null;
    } catch {
      return memory.get(k) ?? null;
    }
  },
  set(k: string, v: string) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
      else memory.set(k, v);
    } catch (e) {
      memory.set(k, v);
      throw e;
    }
  },
  del(k: string) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
    } catch {
      /* noop */
    }
    memory.delete(k);
  },
};

export function metaOf(s: GameState): SaveMeta {
  const c = userClub(s);
  return { id: s.id, name: s.name, president: `${s.president.name} ${s.president.surname}`, club: c?.name ?? null, position: LEVEL_NAMES[careerLevel(s)], season: s.season, week: s.week, updatedAt: s.updatedAt, level: careerLevel(s) };
}

export function serialize(s: GameState): string {
  return LZString.compressToUTF16(JSON.stringify(s));
}
export function deserialize(raw: string): GameState | null {
  try {
    const json = raw.startsWith('{') ? raw : LZString.decompressFromUTF16(raw);
    if (!json) return null;
    const s = JSON.parse(json) as GameState;
    return migrate(s);
  } catch {
    return null;
  }
}

/** Migraciones de versiones futuras del guardado. */
export function migrate(s: GameState): GameState {
  if (!s.flags) s.flags = {};
  if (!s.economy.staffCost) s.economy.staffCost = 1;
  if (!s.president.lastActionAbs) s.president.lastActionAbs = {};
  return s;
}

export class LocalSaveRepository implements SaveRepository {
  list(): SaveMeta[] {
    try {
      return (JSON.parse(storage.get(PREFIX + 'index') ?? '[]') as SaveMeta[]).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }
  load(id: string): GameState | null {
    const raw = storage.get(PREFIX + 'save:' + id);
    return raw ? deserialize(raw) : null;
  }
  save(s: GameState) {
    s.updatedAt = Date.now();
    storage.set(PREFIX + 'save:' + s.id, serialize(s));
    const idx = this.list().filter((m) => m.id !== s.id);
    idx.push(metaOf(s));
    storage.set(PREFIX + 'index', JSON.stringify(idx));
    storage.set(PREFIX + 'last', s.id);
  }
  remove(id: string) {
    storage.del(PREFIX + 'save:' + id);
    storage.set(PREFIX + 'index', JSON.stringify(this.list().filter((m) => m.id !== id)));
    if (storage.get(PREFIX + 'last') === id) storage.del(PREFIX + 'last');
  }
  lastPlayed() {
    const id = storage.get(PREFIX + 'last');
    return id && this.list().some((m) => m.id === id) ? id : this.list()[0]?.id ?? null;
  }
  history(): CareerHistoryEntry[] {
    try {
      return JSON.parse(storage.get(PREFIX + 'history') ?? '[]');
    } catch {
      return [];
    }
  }
  addHistory(e: CareerHistoryEntry) {
    const h = this.history().filter((x) => x.id !== e.id);
    h.unshift(e);
    storage.set(PREFIX + 'history', JSON.stringify(h.slice(0, 50)));
  }
}

export const repo: SaveRepository = new LocalSaveRepository();

export function exportSave(s: GameState): string {
  return `ELPRESIDENTE1:${LZString.compressToBase64(JSON.stringify(s))}`;
}
export function importSave(text: string): GameState | null {
  try {
    const t = text.trim();
    const json = t.startsWith('ELPRESIDENTE1:') ? LZString.decompressFromBase64(t.slice(14)) : t;
    if (!json) return null;
    const s = JSON.parse(json) as GameState;
    if (!s.id || !s.clubs || !s.players || !s.president) return null;
    s.id = `${s.id.split('_imp')[0]}_imp${Date.now().toString(36)}`;
    return migrate(s);
  } catch {
    return null;
  }
}

export function historyEntry(s: GameState, reason: string): CareerHistoryEntry {
  const L = computeLegacy(s);
  return { id: s.id, president: `${s.president.name} ${s.president.surname}`, seasons: `${s.startSeason}–${s.season}`, endedAt: Date.now(), legacy: L.total, titles: s.career.titles.length, peak: LEVEL_NAMES[s.career.peakLevel] ?? '', bio: L.bio, reason };
}
