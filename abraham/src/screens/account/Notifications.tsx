import { useSession, type NotificationPrefs } from '@/store/session';
import { Toggle } from '@/components/ui/Choice';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/layout/PageHeader';

const items: { key: keyof NotificationPrefs; title: string; body: string }[] = [
  { key: 'orderStatus', title: 'Estado del pedido', body: 'Cuando tu pedido cambia de estado.' },
  { key: 'promotions', title: 'Promociones y cupones', body: 'Ofertas disponibles en tu sucursal.' },
  { key: 'news', title: 'Novedades de ABRAHAM', body: 'Nuevos productos y beneficios para clientes.' },
];

export default function Notifications() {
  const { notifications, setNotification } = useSession();
  return (
    <>
      <PageHeader title="Notificaciones" fallback="/cuenta" />
      <div className="mx-auto max-w-[640px] px-gutter pt-2 lg:px-8">
        <ul className="divide-y divide-line overflow-hidden rounded-lg bg-white shadow-hairline">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-4 px-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-body">{i.title}</p>
                <p className="text-footnote text-stone">{i.body}</p>
              </div>
              <Toggle label={i.title} checked={notifications[i.key]} onChange={(v) => setNotification(i.key, v)} />
            </li>
          ))}
        </ul>
        <Notice className="mt-4">Las preferencias se guardan ahora; el envío de notificaciones se activará en una próxima versión.</Notice>
      </div>
    </>
  );
}
