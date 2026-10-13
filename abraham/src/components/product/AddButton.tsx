import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

/** Round quick-add control. Visual 36px, hit area 44px. */
export function AddButton({
  onClick,
  label,
  className,
  tone = 'dark',
}: {
  onClick: () => void;
  label: string;
  className?: string;
  tone?: 'dark' | 'light';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'press flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-red hover:text-white',
        tone === 'dark' ? 'bg-ink text-white' : 'bg-white text-ink',
        'before:absolute before:-inset-1 before:content-[""]',
        !className?.includes('absolute') && 'relative',
        className,
      )}
    >
      <Icon icon={Plus} size={18} />
    </button>
  );
}
