import { Bell, Check } from 'lucide-react';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PlateMotif } from './PlateMotif';

/**
 * Placeholder slot for a future customer benefits programme.
 * Intentionally shows no points, tiers or rewards until the programme is defined.
 */
export function LoyaltyTeaser() {
  const subscribed = useSession((s) => s.notifications.news);
  const setNotification = useSession((s) => s.setNotification);
  const showToast = useUi((s) => s.showToast);
  return (
    <section className="relative isolate overflow-hidden rounded-lg bg-ink p-6 text-white lg:p-10">
      <PlateMotif className="absolute -bottom-[40%] -right-[18%] -z-10 w-[70%] text-white/[0.07] lg:w-[36%]" />
      <p className="eyebrow text-white/60">Clientes ABRAHAM</p>
      <h2 className="mt-2 max-w-[280px] text-title2 font-semibold lg:max-w-md lg:text-title1">Beneficios por tus pedidos, muy pronto</h2>
      <p className="mt-2 max-w-[320px] text-callout text-white/70">
        Estamos preparando un programa para quienes nos eligen seguido. Te avisamos cuando esté disponible.
      </p>
      {subscribed ? (
        <span className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-callout font-medium">
          <Icon icon={Check} size={16} /> Te vamos a avisar
        </span>
      ) : (
        <Button
          variant="light"
          size="md"
          className="mt-6"
          leading={<Icon icon={Bell} size={16} />}
          onClick={() => {
            setNotification('news', true);
            showToast('Listo, te avisaremos');
          }}
        >
          Avisarme
        </Button>
      )}
    </section>
  );
}
