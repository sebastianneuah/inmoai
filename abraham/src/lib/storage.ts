import { createJSONStorage } from 'zustand/middleware';

/**
 * Persistence adapter. Uses localStorage on the web; swap for @capacitor/preferences
 * when packaging natively without touching the stores.
 */
const safeLocalStorage = {
  getItem: (name: string) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* storage unavailable (private mode) — state stays in memory */
    }
  },
  removeItem: (name: string) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const appStorage = createJSONStorage(() => safeLocalStorage);
