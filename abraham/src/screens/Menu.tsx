import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SearchX, X } from 'lucide-react';
import { categories } from '@/data/categories';
import { products } from '@/data/products';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenTitle } from '@/components/layout/PageHeader';
import { ProductRow } from '@/components/product/ProductRow';
import type { CategoryId } from '@/types';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Distance from the top of the viewport at which a section counts as "current". */
function stickyOffset() {
  return window.matchMedia('(min-width: 1024px)').matches ? 104 : 72;
}

export default function Menu() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<CategoryId>(categories[0].id);
  const chipRefs = useRef<Partial<Record<CategoryId, HTMLButtonElement | null>>>({});
  const lockSpy = useRef(false);

  const grouped = useMemo(
    () => categories.map((c) => ({ category: c, items: products.filter((p) => p.categoryId === c.id) })),
    [],
  );

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return null;
    return products.filter((p) => normalize(`${p.name} ${p.description}`).includes(q));
  }, [query]);

  const scrollTo = useCallback((id: CategoryId, smooth = true) => {
    const el = document.getElementById(`cat-${id}`);
    if (!el) return;
    setActive(id);
    lockSpy.current = true;
    const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset() + 1;
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    window.setTimeout(() => (lockSpy.current = false), smooth ? 700 : 50);
  }, []);

  // Deep link: /menu?c=hot-rolls
  useEffect(() => {
    const c = params.get('c') as CategoryId | null;
    if (c && categories.some((x) => x.id === c)) {
      requestAnimationFrame(() => scrollTo(c, false));
      setParams({}, { replace: true });
    }
  }, [params, setParams, scrollTo]);

  // Scroll spy
  useEffect(() => {
    if (results) return;
    let frame = 0;
    const onScroll = () => {
      if (lockSpy.current) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const offset = stickyOffset() + 8;
        let current = categories[0].id;
        for (const c of categories) {
          const el = document.getElementById(`cat-${c.id}`);
          if (el && el.getBoundingClientRect().top <= offset) current = c.id;
        }
        setActive(current);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [results]);

  // Keep the active chip visible in the horizontal rail.
  useEffect(() => {
    chipRefs.current[active]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  return (
    <div className="mx-auto max-w-content lg:px-8">
      <ScreenTitle title="Menú" subtitle="Precios de demostración, sujetos a confirmación." />

      <div className="px-gutter lg:px-0">
        <label className="relative block lg:max-w-[420px]">
          <span className="sr-only">Buscar en el menú</span>
          <Icon icon={Search} size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar rolls, niguiris, bebidas…"
            className="h-12 w-full rounded-full bg-white pl-11 pr-12 text-body shadow-hairline outline-none placeholder:text-stone-light focus:shadow-[0_0_0_1.5px_#111111] [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Borrar búsqueda"
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-stone hover:text-ink"
            >
              <Icon icon={X} size={18} />
            </button>
          )}
        </label>
      </div>

      {results ? (
        <section className="mt-6 px-gutter lg:px-0" aria-live="polite">
          <p className="text-footnote text-stone">
            {results.length === 1 ? '1 resultado' : `${results.length} resultados`}
          </p>
          {results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Sin resultados"
              body={`No encontramos productos para “${query.trim()}”. Probá con otro nombre o ingrediente.`}
            />
          ) : (
            <div className="mt-2 divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-4 lg:divide-y-0">
              {results.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="lg:mt-8 lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
          {/* Mobile sticky category rail */}
          <nav
            aria-label="Categorías"
            className="sticky top-0 z-20 mt-4 border-b border-line bg-paper/95 pt-safe backdrop-blur-xl lg:hidden"
          >
            <div className="no-scrollbar flex gap-1 overflow-x-auto px-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  ref={(el) => (chipRefs.current[c.id] = el)}
                  type="button"
                  onClick={() => scrollTo(c.id)}
                  aria-current={active === c.id}
                  className={cn(
                    'relative flex h-[52px] shrink-0 items-center whitespace-nowrap px-2.5 text-callout transition-colors',
                    active === c.id ? 'font-medium text-ink' : 'text-stone hover:text-ink',
                  )}
                >
                  {c.name}
                  <span
                    className={cn(
                      'absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-red transition-opacity',
                      active === c.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </button>
              ))}
            </div>
          </nav>

          {/* Desktop sticky category list */}
          <nav aria-label="Categorías" className="hidden lg:block">
            <ul className="sticky top-[104px] flex flex-col">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(c.id)}
                    aria-current={active === c.id}
                    className={cn(
                      'flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-callout transition-colors',
                      active === c.id ? 'bg-white font-medium text-ink shadow-hairline' : 'text-stone hover:text-ink',
                    )}
                  >
                    <span className={cn('h-4 w-0.5 rounded-full', active === c.id ? 'bg-red' : 'bg-transparent')} />
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            {grouped.map(({ category, items }) => (
              <section
                key={category.id}
                id={`cat-${category.id}`}
                aria-labelledby={`h-${category.id}`}
                className="px-gutter pt-8 lg:px-0 lg:pt-0 lg:[&:not(:first-child)]:pt-12"
              >
                <header className="mb-1 lg:mb-4">
                  <h2 id={`h-${category.id}`} className="text-title2 font-semibold">
                    {category.name}
                  </h2>
                  <p className="mt-0.5 text-footnote text-stone">{category.description}</p>
                </header>
                <div className="divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-4 lg:divide-y-0">
                  {items.map((p) => (
                    <ProductRow key={p.id} product={p} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
