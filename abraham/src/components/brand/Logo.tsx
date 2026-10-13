import { brandConfig } from '@/config/app';
import { cn } from '@/lib/cn';

/**
 * Brand mark slot.
 * When the official ABRAHAM logo file is provided (brandConfig.logoSrc) it is rendered untouched.
 * Until then this shows a neutral typographic wordmark placeholder — not the official logo.
 */
export function Logo({ tone = 'ink', className }: { tone?: 'ink' | 'white'; className?: string }) {
  const src = tone === 'white' ? brandConfig.logoLightSrc ?? brandConfig.logoSrc : brandConfig.logoSrc;
  if (src) return <img src={src} alt="ABRAHAM" className={cn('h-6 w-auto', className)} />;
  return (
    <span
      className={cn(
        'inline-flex select-none items-center text-[17px] font-semibold uppercase leading-none tracking-[0.28em]',
        tone === 'white' ? 'text-white' : 'text-ink',
        className,
      )}
      aria-label="ABRAHAM"
      data-logo-placeholder
    >
      Abraham
    </span>
  );
}
