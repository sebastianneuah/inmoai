import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { Campaign } from '@/types';
import { PlateMotif } from './PlateMotif';

const surfaces = {
  ink: { bg: 'bg-ink', text: 'text-white', sub: 'text-white/70', motif: 'text-white/[0.08]', btn: 'light' as const },
  paper: { bg: 'bg-tone-salmon', text: 'text-ink', sub: 'text-ink/70', motif: 'text-ink/[0.07]', btn: 'dark' as const },
  red: { bg: 'bg-red', text: 'text-white', sub: 'text-white/80', motif: 'text-white/[0.12]', btn: 'light' as const },
};

export function CampaignSlide({ campaign, eager, compact }: { campaign: Campaign; eager?: boolean; compact?: boolean }) {
  const hasImage = !!campaign.image;
  const s = hasImage ? surfaces.ink : surfaces[campaign.surface];
  return (
    <Link
      to={campaign.to}
      className={cn(
        'group relative isolate flex w-full flex-col justify-end overflow-hidden rounded-lg lg:justify-center',
        compact ? 'aspect-[6/5] sm:aspect-[2/1] lg:aspect-[2.8/1]' : 'aspect-[20/21] sm:aspect-[16/11] lg:aspect-[2.4/1]',
        s.bg,
      )}
    >
      {hasImage ? (
        <>
          <img
            src={campaign.image!}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          {/* readability only: bottom-weighted shade */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent lg:bg-gradient-to-r" />
        </>
      ) : (
        <PlateMotif
          className={cn(
            'absolute -z-10 transition-transform duration-700 ease-ios group-hover:rotate-6',
            '-right-[38%] -top-[18%] w-[95%] lg:-right-[6%] lg:top-1/2 lg:w-[52%] lg:-translate-y-1/2',
            s.motif,
          )}
        />
      )}
      <div className="p-6 lg:max-w-[560px] lg:p-14">
        <p className={cn('eyebrow mb-3 flex items-center gap-2', s.sub)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', campaign.surface === 'red' && !hasImage ? 'bg-white' : 'bg-red')} />
          {campaign.eyebrow}
        </p>
        <h2 className={cn('text-title1 font-semibold lg:text-hero', s.text)}>{campaign.title}</h2>
        <p className={cn('mt-3 max-w-[340px] text-body lg:text-headline lg:font-normal', s.sub)}>{campaign.body}</p>
        <span className={buttonClass({ variant: s.btn, size: 'md' }, 'mt-6 pointer-events-none')}>
          {campaign.cta}
          <Icon icon={ArrowRight} size={16} />
        </span>
      </div>
    </Link>
  );
}

export function HeroCarousel({ campaigns }: { campaigns: Campaign[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const go = (i: number) => {
    const el = track.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <section aria-roledescription="carrusel" aria-label="Campañas">
      <div
        ref={track}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {campaigns.map((c, i) => (
          <div
            key={c.id}
            className="w-full shrink-0 snap-center px-gutter lg:px-0"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${campaigns.length}`}
          >
            <CampaignSlide campaign={c} eager={i === 0} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-0.5" role="tablist" aria-label="Elegir campaña">
        {campaigns.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Campaña ${i + 1}`}
            onClick={() => go(i)}
            className="flex h-6 items-center px-1"
          >
            <span
              className={cn(
                'block h-1.5 rounded-full transition-all duration-300 ease-ios',
                i === index ? 'w-5 bg-ink' : 'w-1.5 bg-line-strong',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
