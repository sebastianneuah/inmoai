import { Link } from 'react-router-dom';
import { useQuickAdd } from '@/hooks/useQuickAdd';
import { Price } from '@/components/ui/Price';
import { FoodImage } from '@/components/media/FoodImage';
import type { Product } from '@/types';
import { AddButton } from './AddButton';

/** Compact row for dark promotional bands. */
export function PromoListItem({ product }: { product: Product }) {
  const quickAdd = useQuickAdd();
  return (
    <Link to={`/producto/${product.id}`} className="group flex items-center gap-4 py-4">
      <FoodImage src={product.image} alt={product.name} tone={product.tone} mark="sm" className="h-16 w-16 shrink-0 rounded-sm ring-1 ring-white/10" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-white">{product.name}</p>
        <p className="truncate text-footnote text-white/60">{product.portion}</p>
      </div>
      <Price value={product.price} className="text-callout font-medium text-white" />
      <AddButton
        onClick={() => quickAdd(product.id)}
        label={`Agregar ${product.name}`}
        tone="light"
      />
    </Link>
  );
}
