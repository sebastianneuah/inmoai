import { Link } from 'react-router-dom';
import { productById } from '@/data/products';
import { formatPrice } from '@/lib/format';
import { describeModifiers, lineTotal } from '@/lib/pricing';
import { useCart } from '@/store/cart';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { FoodImage } from '@/components/media/FoodImage';
import type { CartLine } from '@/types';

export function CartLineItem({ line }: { line: CartLine }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const product = productById(line.productId);
  if (!product) return null;
  const mods = describeModifiers(line.modifiers);
  return (
    <li className="flex gap-3.5 py-4">
      <Link to={`/producto/${product.id}`} className="shrink-0">
        <FoodImage src={product.image} alt={product.name} tone={product.tone} mark="sm" className="h-[72px] w-[72px] rounded-sm" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body font-medium">{product.name}</p>
            <p className="text-footnote text-stone">{product.portion}</p>
          </div>
          <p className="tabular shrink-0 text-body font-medium">{formatPrice(lineTotal(line))}</p>
        </div>
        {mods && <p className="mt-1 text-footnote text-ink-muted">{mods}</p>}
        {line.notes && <p className="mt-0.5 line-clamp-2 text-footnote italic text-stone">“{line.notes}”</p>}
        <div className="mt-3 flex items-center justify-between">
          <QuantityStepper
            size="sm"
            removable
            value={line.quantity}
            onChange={(q) => setQuantity(line.key, q)}
            label={`Cantidad de ${product.name}`}
          />
          {line.quantity > 1 && (
            <span className="tabular text-caption text-stone">
              {formatPrice(lineTotal({ ...line, quantity: 1 }))} c/u
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
