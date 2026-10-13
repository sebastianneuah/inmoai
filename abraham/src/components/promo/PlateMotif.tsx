import { cn } from '@/lib/cn';

/** Concentric "plate seen from above" motif used on typographic campaigns. */
export function PlateMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={cn('pointer-events-none', className)} aria-hidden>
      <circle cx="100" cy="100" r="98" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="46" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="20" fill="currentColor" />
    </svg>
  );
}
