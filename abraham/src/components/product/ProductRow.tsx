import { Link } from 'react-router-dom';
import { useQuickAdd } from '@/hooks/useQuickAdd';
import { cn } from '@/lib/cn';
import { ProductBadgeTag } from '@/components/ui/Badge';
import { Price } from '@/components/ui/Price';
import { FoodImage } from '@/components/media/FoodImage';
import type { Product } from '@/types';
import { AddButton } from './AddButton';

/**
 * Menu list row: text left, image right with quick-add docked on the image.
 * On desktop rows become individual cards in a two-column grid.
 */
export function ProductRow({ product }: { product: Product }) {
  const quickAdd = useQuickAdd();
  return (
    <Link
      to={`/producto/${product.id}`}
      className={cn(
        'group flex items-stretch gap-4 py-4 transition-colors',
        'lg:rounded-lg lg:bg-white lg:px-4 lg:shadow-hairline lg:hover:shadow-[0_0_0_1px_#D9D6D2]',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {product.badges && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {product.badges.map((b) => (
              <ProductBadgeTag key={b} badge={b} />
            ))}
          </div>
        )}
        <h3 className="text-body font-medium text-ink group-hover:text-ink-soft">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-footnote text-stone">{product.description}</p>
        <p className="mt-auto pt-2.5 text-callout">
          <Price value={product.price} className="font-semibold text-ink" />
          <span className="text-stone"> · {product.portion}</span>
        </p>
      </div>
      <div className="relative shrink-0 self-start">
        <FoodImage src={product.image} alt={product.name} tone={product.tone} mark="sm" className="h-[108px] w-[108px] rounded-md" />
        <AddButton
          onClick={() => quickAdd(product.id)}
          label={`Agregar ${product.name}`}
          className="absolute -bottom-1.5 -right-1.5 ring-[3px] ring-paper lg:ring-white"
        />
      </div>
    </Link>
  );
}
