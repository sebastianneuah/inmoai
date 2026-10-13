import { create } from 'zustand';

interface Toast {
  id: number;
  message: string;
  action?: { label: string; to: string };
}

interface UiState {
  toast: Toast | null;
  locationSheetOpen: boolean;
  showToast: (message: string, action?: Toast['action']) => void;
  dismissToast: () => void;
  openLocationSheet: (open: boolean) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiState>()((set) => ({
  toast: null,
  locationSheetOpen: false,
  showToast: (message, action) => {
    clearTimeout(timer);
    set({ toast: { id: Date.now(), message, action } });
    timer = setTimeout(() => set({ toast: null }), 2800);
  },
  dismissToast: () => set({ toast: null }),
  openLocationSheet: (locationSheetOpen) => set({ locationSheetOpen }),
}));
