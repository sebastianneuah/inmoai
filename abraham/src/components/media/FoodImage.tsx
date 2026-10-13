import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { ImageTone } from '@/types';

const toneClass: Record<ImageTone, string> = {
  salmon: 'bg-tone-salmon',
  tuna: 'bg-tone-tuna',
  avocado: 'bg-tone-avocado',
  rice: 'bg-tone-rice',
  nori: 'bg-tone-nori',
  tempura: 'bg-tone-tempura',
  citrus: 'bg-tone-citrus',
  greens: 'bg-tone-greens',
  drink: 'bg-tone-drink',
  combo: 'bg-tone-combo',
};

interface Props {
  src?: string | null;
  alt: string;
  tone: ImageTone;
  className?: string;
  /** Placeholder mark size relative to the container. */
  mark?: 'sm' | 'md' | 'lg' | 'none';
  /** Shows a discreet "Foto pendiente" caption on large placeholders. */
  caption?: boolean;
  eager?: boolean;
}

/**
 * Every food image in the app goes through here so cropping and placeholders stay consistent.
 * Without `src` it renders a tonal placeholder — clearly a slot for real photography,
 * never a stock photo posing as ABRAHAM's product.
 */
export function FoodImage({ src, alt, tone, className, mark = 'md', caption, eager }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showPhoto = !!src && !failed;
  const dark = tone === 'nori';

  return (
    <div className={cn('relative isolate overflow-hidden', toneClass[tone], className)}>
      {showPhoto ? (
        <>
          {!loaded && <div className="shimmer absolute inset-0" aria-hidden />}
          <img
            src={src!}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-300',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        </>
      ) : (
        <div role="img" aria-label={`${alt} — foto pendiente`} className="absolute inset-0" data-placeholder>
          {/* soft top-left light so the field reads as a surface, not a flat swatch */}
          <div
            className="absolute inset-0"
            style={{
              background: dark
                ? 'radial-gradient(120% 90% at 25% 15%, rgba(255,255,255,0.07), transparent 60%)'
                : 'radial-gradient(120% 90% at 25% 15%, rgba(255,255,255,0.55), transparent 60%)',
            }}
          />
          {mark !== 'none' && (
            <PlateMark
              className={cn(
                'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                dark ? 'text-white/[0.14]' : 'text-ink/[0.10]',
                mark === 'sm' && 'w-[38%] max-w-[56px]',
                mark === 'md' && 'w-[34%] max-w-[96px]',
                mark === 'lg' && 'w-[30%] max-w-[160px]',
              )}
            />
          )}
          {caption && (
            <span
              className={cn(
                'absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em]',
                dark ? 'bg-white/10 text-white/60' : 'bg-white/60 text-ink/50',
              )}
            >
              Foto pendiente
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Abstract top-down plate — neutral placeholder mark, not an illustration of a product. */
function PlateMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="19" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="7" fill="currentColor" />
    </svg>
  );
}
