import { Heart } from 'lucide-react';
import { productById } from '@/data/products';
import { useSession } from '@/store/session';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductTile } from '@/components/product/ProductTile';

export default function Favorites() {
  const favorites = useSession((s) => s.favorites);
  const items = favorites.map(productById).filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <>
      <PageHeader title="Favoritos" fallback="/cuenta" />
      <div className="mx-auto max-w-content px-gutter pt-2 lg:px-8">
        {items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Todavía no tenés favoritos"
            body="Tocá el corazón en un producto para guardarlo acá."
            action={<ButtonLink to="/menu" variant="dark" size="md">Explorar el menú</ButtonLink>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {items.map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
