import type { Modifier, ModifierId } from '@/types';

/** Prices are DEMO VALUES. */
export const modifiers: Record<ModifierId, Modifier> = {
  'sin-palta': { id: 'sin-palta', name: 'Sin palta', price: 0, kind: 'remove' },
  'sin-queso-crema': { id: 'sin-queso-crema', name: 'Sin queso crema', price: 0, kind: 'remove' },
  'sin-mango': { id: 'sin-mango', name: 'Sin mango', price: 0, kind: 'remove' },
  cocido: { id: 'cocido', name: 'Cocido', price: 0, kind: 'preparation' },
  panizado: { id: 'panizado', name: 'Panizado', price: 1800, kind: 'preparation' },
};
