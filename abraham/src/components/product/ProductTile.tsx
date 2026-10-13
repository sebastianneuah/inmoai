import { Link } from 'react-router-dom';
import { useQuickAdd } from '@/hooks/useQuickAdd';
import { cn } from '@/lib/cn';
import { ProductBadgeTag } from '@/components/ui/Badge';
import { Price } from '@/components/ui/Price';
import { FoodImage } from '@/components/media/FoodImage';
import type { Product } from '@/types';
import { AddButton } from './AddButton';

/** Vertical card: home carousels and desktop grids. Square image, no card chrome. */
export function ProductTile({
  product,
  className,
  imageClassName = 'aspect-square',
}: {
  product: Product;
  className?: string;
  imageClassName?: string;
}) {
  const quickAdd = useQuickAdd();
  const badge = product.badges?.[0];
  return (
    <Link to={`/producto/${product.id}`} className={cn('group flex flex-col', className)}>
      <div className="relative">
        <FoodImage
          src={product.image}
          alt={product.name}
          tone={product.tone}
          className={cn(imageClassName, 'w-full rounded-md transition-transform duration-500 ease-ios group-hover:scale-[1.015]')}
        />
        {badge && <ProductBadgeTag badge={badge} className="absolute left-2.5 top-2.5" />}
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="text-body font-medium leading-snug text-ink">{product.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-footnote text-stone">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="leading-tight">
            <Price value={product.price} className="block text-body font-semibold" />
            <span className="block text-caption text-stone">{product.portion}</span>
          </span>
          <AddButton onClick={() => quickAdd(product.id)} label={`Agregar ${product.name}`} />
        </div>
      </div>
    </Link>
  );
}
