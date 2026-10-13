import { Link } from 'react-router-dom';
import { FoodImage } from '@/components/media/FoodImage';
import type { Category } from '@/types';

export function CategoryThumb({ category }: { category: Category }) {
  return (
    <Link to={`/menu?c=${category.id}`} className="group flex w-[80px] shrink-0 flex-col items-center gap-2 lg:w-auto">
      <FoodImage
        src={category.image}
        alt={category.name}
        tone={category.tone}
        mark="sm"
        className="aspect-square w-[80px] rounded-lg transition-transform duration-300 ease-ios group-active:scale-95 lg:w-full"
      />
      <span className="w-full truncate text-center text-caption font-medium text-ink">{category.name}</span>
    </Link>
  );
}
