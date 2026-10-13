import { useCallback } from 'react';
import { productById } from '@/data/products';
import { useCart } from '@/store/cart';
import { useUi } from '@/store/ui';

export function useQuickAdd() {
  const add = useCart((s) => s.add);
  const showToast = useUi((s) => s.showToast);
  return useCallback(
    (productId: string) => {
      const p = productById(productId);
      if (!p) return;
      add({ productId, quantity: 1 });
      showToast(`Agregaste ${p.name}`, { label: 'Ver pedido', to: '/carrito' });
    },
    [add, showToast],
  );
}
