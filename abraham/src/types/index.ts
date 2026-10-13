/**
 * Domain types. Shapes are deliberately close to what a Supabase schema would expose
 * (snake_case can be mapped in the service layer) so screens don't change when data goes live.
 */

export type CategoryId =
  | 'combinados'
  | 'clasicos'
  | 'premium'
  | 'hot-rolls'
  | 'niguiris'
  | 'geishas'
  | 'sashimi'
  | 'ensaladas'
  | 'woks'
  | 'bebidas'
  | 'promociones';

/** Tonal field used for an image placeholder until real photography is provided. */
export type ImageTone =
  | 'salmon'
  | 'tuna'
  | 'avocado'
  | 'rice'
  | 'nori'
  | 'tempura'
  | 'citrus'
  | 'greens'
  | 'drink'
  | 'combo';

export interface Category {
  id: CategoryId;
  name: string;
  /** Short line shown under the category title in the menu. */
  description: string;
  tone: ImageTone;
  image?: string | null;
}

export type ModifierId = 'sin-palta' | 'sin-queso-crema' | 'sin-mango' | 'cocido' | 'panizado';

export interface Modifier {
  id: ModifierId;
  name: string;
  /** Extra charge in ARS. 0 for removals. */
  price: number;
  kind: 'remove' | 'preparation';
}

export type ProductBadge = 'nuevo' | 'picante' | 'vegetariano' | 'para-compartir';

export interface Product {
  id: string;
  categoryId: CategoryId;
  name: string;
  description: string;
  /** e.g. "10 piezas", "500 ml" */
  portion: string;
  /** ARS, integer. DEMO VALUES until real prices are loaded. */
  price: number;
  /** Applicable modifiers only. Empty = product is added without customisation. */
  modifiers: ModifierId[];
  badges?: ProductBadge[];
  featured?: boolean;
  tone: ImageTone;
  /** Replace with the real photo path, e.g. "images/products/philadelphia-roll.jpg". */
  image?: string | null;
  /** Ids of products suggested as complements on the detail screen. */
  related?: string[];
  /** Branch ids where the product is NOT available. Empty = available everywhere. */
  unavailableAt?: string[];
}

export type FulfillmentMode = 'delivery' | 'pickup';

export interface Branch {
  id: string;
  name: string;
  shortName: string;
  address: string;
  city: string;
  /** Inactive branches are visible but cannot receive orders. */
  active: boolean;
  delivery: {
    enabled: boolean;
    /** ARS. DEMO VALUE. */
    fee: number;
    /** Neighbourhoods covered by this kitchen. DEMO CONFIGURATION — confirm with operations. */
    coverage: string[];
  };
  pickupEnabled: boolean;
  /** Identifier used later to route the order to this kitchen (e.g. Fudo store id). */
  kitchenRef: string | null;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  number: string;
  apartment?: string;
  neighborhood: string;
  notes?: string;
}

export interface CartLine {
  key: string;
  productId: string;
  quantity: number;
  modifiers: ModifierId[];
  notes?: string;
}

export type CouponKind = 'percent' | 'fixed' | 'free-delivery';

export interface Coupon {
  code: string;
  title: string;
  description: string;
  kind: CouponKind;
  /** percent: 0–100. fixed: ARS. free-delivery: ignored. */
  value: number;
  minSubtotal: number;
  /** ISO date (inclusive). */
  expiresAt: string;
  terms: string[];
  modes?: FulfillmentMode[];
}

export type PaymentMethodId = 'mercadopago' | 'cash' | 'transfer';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  description: string;
  available: boolean;
}

export type OrderStatus = 'received' | 'preparing' | 'on-the-way' | 'ready' | 'delivered' | 'picked-up' | 'cancelled';

export interface OrderTotals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export interface OrderLine {
  productId: string;
  name: string;
  quantity: number;
  modifiers: ModifierId[];
  notes?: string;
  unitPrice: number;
}

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  mode: FulfillmentMode;
  branchId: string;
  address?: Address;
  customer: { name: string; phone: string; email?: string };
  lines: OrderLine[];
  couponCode?: string;
  paymentMethod: PaymentMethodId;
  totals: OrderTotals;
  /** Demo orders are never sent to a kitchen nor charged. */
  simulated: true;
  /** Seeded examples shown so the history screen can be reviewed. */
  example?: boolean;
  /** Fixed status for example orders. Live demo orders derive status from elapsed time. */
  fixedStatus?: OrderStatus;
}

export interface Campaign {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  to: string;
  tone: ImageTone;
  image?: string | null;
  /** Visual treatment when no photography is available. */
  surface: 'ink' | 'paper' | 'red';
}
