import type { Branch } from '@/types';

/**
 * Branch configuration.
 * - `active: false` keeps a branch visible as "Próximamente" without accepting orders.
 * - `coverage` and `fee` are DEMO VALUES — replace with the real delivery zones per kitchen.
 * - `kitchenRef` will hold the POS/kitchen identifier used to route orders (e.g. Fudo).
 */
export const branches: Branch[] = [
  {
    id: 'palermo-chico',
    name: 'ABRAHAM Palermo Chico',
    shortName: 'Palermo Chico',
    address: 'Silvio Ruggieri 2787',
    city: 'Buenos Aires',
    active: true,
    delivery: {
      enabled: true,
      fee: 2500,
      coverage: ['Palermo Chico', 'Palermo', 'Recoleta', 'Barrio Norte', 'Belgrano', 'Colegiales'],
    },
    pickupEnabled: true,
    kitchenRef: null,
  },
  {
    id: 'belgrano',
    name: 'ABRAHAM Belgrano',
    shortName: 'Belgrano',
    address: 'Ciudad de la Paz 2479',
    city: 'Buenos Aires',
    active: false,
    delivery: {
      enabled: true,
      fee: 2500,
      coverage: ['Belgrano', 'Núñez', 'Colegiales', 'Coghlan', 'Saavedra'],
    },
    pickupEnabled: true,
    kitchenRef: null,
  },
];

export const branchById = (id: string | null | undefined) => branches.find((b) => b.id === id);

/** Neighbourhoods offered when adding an address (union of all configured coverage). */
export const neighborhoods = Array.from(
  new Set([...branches.flatMap((b) => b.delivery.coverage), 'Caballito', 'Villa Crespo', 'Almagro', 'Otro']),
);
