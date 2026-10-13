import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { FoodImage } from '@/components/media/FoodImage';
import type { Campaign } from '@/types';

/** Editorial horizontal card for secondary campaigns. */
export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Link
      to={campaign.to}
      className="group grid min-h-[168px] grid-cols-[1fr_40%] overflow-hidden rounded-lg bg-white shadow-hairline"
    >
      <div className="flex flex-col p-5">
        <p className="eyebrow text-stone">{campaign.eyebrow}</p>
        <h3 className="mt-2 text-headline font-semibold">{campaign.title}</h3>
        <p className="mt-1 text-footnote text-stone">{campaign.body}</p>
        <span className="mt-auto flex items-center gap-1 pt-4 text-footnote font-medium text-red">
          {campaign.cta}
          <Icon icon={ArrowRight} size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <FoodImage src={campaign.image} alt={campaign.title} tone={campaign.tone} mark="sm" className="h-full" />
    </Link>
  );
}
