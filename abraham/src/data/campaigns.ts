import type { Campaign } from '@/types';

/**
 * Home and Ofertas campaigns. Set `image` to campaign photography in /public/images/campaigns.
 * Without an image each campaign renders as a typographic composition on its `surface`.
 */
export const heroCampaigns: Campaign[] = [
  {
    id: 'combinados',
    eyebrow: 'Para compartir',
    title: 'Combinados de 15, 30 y 45 piezas',
    body: 'Una selección armada por nuestros sushimen, lista para la mesa.',
    cta: 'Ver combinados',
    to: '/menu?c=combinados',
    tone: 'combo',
    surface: 'ink',
  },
  {
    id: 'flambeado',
    eyebrow: 'Nuevo',
    title: 'Salmón Flambeado',
    body: 'Salmón sellado al fuego sobre roll de palta y queso crema.',
    cta: 'Pedir ahora',
    to: '/producto/salmon-flambeado',
    tone: 'salmon',
    surface: 'paper',
  },
  {
    id: 'promo-noche',
    eyebrow: 'Promoción',
    title: 'Promo Noche',
    body: '30 piezas, ensalada wakame y dos bebidas.',
    cta: 'Ver promoción',
    to: '/producto/promo-noche',
    tone: 'nori',
    surface: 'red',
  },
];

export const secondaryCampaigns: Campaign[] = [
  {
    id: 'hot-rolls',
    eyebrow: 'Hot Rolls',
    title: 'Panizados, servidos tibios',
    body: 'Philadelphia, teriyaki y veggie.',
    cta: 'Ver hot rolls',
    to: '/menu?c=hot-rolls',
    tone: 'tempura',
    surface: 'paper',
  },
  {
    id: 'poke',
    eyebrow: 'Mediodía',
    title: 'Poke y ensaladas',
    body: 'Opciones frescas para almorzar.',
    cta: 'Ver ensaladas',
    to: '/menu?c=ensaladas',
    tone: 'greens',
    surface: 'paper',
  },
];
