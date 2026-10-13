import type { Category } from '@/types';

/** Menu order follows this array. Edit names/descriptions freely. */
export const categories: Category[] = [
  { id: 'combinados', name: 'Combinados', description: 'Selecciones para compartir', tone: 'combo' },
  { id: 'clasicos', name: 'Clásicos', description: 'Los rolls de siempre', tone: 'salmon' },
  { id: 'premium', name: 'Premium', description: 'Cortes y combinaciones especiales', tone: 'tuna' },
  { id: 'hot-rolls', name: 'Hot Rolls', description: 'Panizados y servidos tibios', tone: 'tempura' },
  { id: 'niguiris', name: 'Niguiris', description: 'Arroz y pescado, 2 unidades', tone: 'rice' },
  { id: 'geishas', name: 'Geishas', description: 'Envueltos en salmón o palta, sin arroz', tone: 'salmon' },
  { id: 'sashimi', name: 'Sashimi', description: 'Cortes de pescado fresco', tone: 'tuna' },
  { id: 'ensaladas', name: 'Ensaladas', description: 'Frescas y livianas', tone: 'greens' },
  { id: 'woks', name: 'Woks', description: 'Salteados al momento', tone: 'tempura' },
  { id: 'bebidas', name: 'Bebidas', description: 'Para acompañar', tone: 'drink' },
  { id: 'promociones', name: 'Promociones', description: 'Combinaciones con precio especial', tone: 'nori' },
];

export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<
  Category['id'],
  Category
>;
