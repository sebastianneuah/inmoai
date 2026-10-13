import { useNavigate } from 'react-router-dom';
import { productById } from '@/data/products';
import { useCart } from '@/store/cart';
import { useUi } from '@/store/ui';
import type { Order } from '@/types';

export function useReorder() {
  const add = useCart((s) => s.add);
  const showToast = useUi((s) => s.showToast);
  const navigate = useNavigate();
  return (order: Order) => {
    const available = order.lines.filter((l) => productById(l.productId));
    available.forEach((l) => add({ productId: l.productId, quantity: l.quantity, modifiers: l.modifiers, notes: l.notes }));
    const skipped = order.lines.length - available.length;
    showToast(skipped ? `Agregamos ${available.length} productos. ${skipped} ya no están disponibles.` : 'Agregamos tu pedido anterior');
    navigate('/carrito');
  };
}
