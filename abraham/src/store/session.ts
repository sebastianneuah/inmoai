import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { branches } from '@/data/branches';
import { appStorage } from '@/lib/storage';
import type { Address, FulfillmentMode } from '@/types';

export interface Profile {
  name: string;
  phone: string;
  email: string;
}

export interface NotificationPrefs {
  orderStatus: boolean;
  promotions: boolean;
  news: boolean;
}

interface SessionState {
  mode: FulfillmentMode;
  /** Explicitly chosen by the customer — never auto-assigned by distance. */
  branchId: string | null;
  addresses: Address[];
  addressId: string | null;
  profile: Profile;
  favorites: string[];
  notifications: NotificationPrefs;

  setMode: (mode: FulfillmentMode) => void;
  setBranch: (id: string) => void;
  saveAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
  selectAddress: (id: string | null) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  toggleFavorite: (productId: string) => void;
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void;
  reset: () => void;
}

const firstActive = branches.find((b) => b.active)?.id ?? null;

const initial = {
  mode: 'delivery' as FulfillmentMode,
  // With a single active branch it is preselected; the customer can still change it.
  branchId: branches.filter((b) => b.active).length === 1 ? firstActive : null,
  addresses: [] as Address[],
  addressId: null as string | null,
  profile: { name: '', phone: '', email: '' },
  favorites: [] as string[],
  notifications: { orderStatus: true, promotions: false, news: false },
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...initial,
      setMode: (mode) => set({ mode }),
      setBranch: (branchId) => set({ branchId }),
      saveAddress: (address) =>
        set((s) => {
          const exists = s.addresses.some((a) => a.id === address.id);
          return {
            addresses: exists
              ? s.addresses.map((a) => (a.id === address.id ? address : a))
              : [...s.addresses, address],
            addressId: address.id,
          };
        }),
      removeAddress: (id) =>
        set((s) => ({
          addresses: s.addresses.filter((a) => a.id !== id),
          addressId: s.addressId === id ? null : s.addressId,
        })),
      selectAddress: (addressId) => set({ addressId }),
      updateProfile: (profile) => set((s) => ({ profile: { ...s.profile, ...profile } })),
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
        })),
      setNotification: (key, value) => set((s) => ({ notifications: { ...s.notifications, [key]: value } })),
      reset: () => set(initial),
    }),
    { name: 'abraham.session', storage: appStorage, version: 1 },
  ),
);
