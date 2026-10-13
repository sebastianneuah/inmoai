import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, CircleHelp, Heart, LogOut, MapPin, ReceiptText, Store, UserRound } from 'lucide-react';
import { appConfig } from '@/config/app';
import { useCart } from '@/store/cart';
import { useOrders } from '@/store/orders';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { ScreenTitle } from '@/components/layout/PageHeader';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export default function Account() {
  const { profile, addresses, favorites, reset } = useSession();
  const clearCart = useCart((s) => s.clear);
  const resetOrders = useOrders((s) => s.reset);
  const showToast = useUi((s) => s.showToast);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasProfile = !!profile.name;

  const logout = () => {
    reset();
    clearCart();
    resetOrders();
    setConfirmOpen(false);
    showToast('Cerraste sesión en este dispositivo');
  };

  return (
    <div className="mx-auto max-w-content lg:px-8">
      <ScreenTitle title="Mi cuenta" />

      <div className="px-gutter lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-12 lg:px-0">
        <div>
          <Link to="/cuenta/datos" className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-hairline hover:bg-paper lg:flex-col lg:items-start lg:p-6">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-headline font-medium text-white">
              {hasProfile ? initials(profile.name) : <Icon icon={UserRound} size={24} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-headline font-semibold">{hasProfile ? profile.name : 'Invitado'}</span>
              <span className="block text-footnote text-stone">
                {hasProfile ? profile.phone || profile.email : 'Completá tus datos para pedir más rápido'}
              </span>
            </span>
            <Icon icon={ChevronRight} size={18} className="text-stone-light lg:hidden" />
          </Link>
          <p className="mt-3 px-1 text-footnote text-stone">
            El inicio de sesión con cuenta estará disponible próximamente. Por ahora tus datos se guardan en este dispositivo.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:mt-0">
          <ListGroup title="Tus pedidos">
            <ListRow icon={ReceiptText} title="Historial de pedidos" to="/pedidos" />
            <ListRow icon={Heart} title="Favoritos" to="/cuenta/favoritos" trailing={<Count n={favorites.length} />} />
            <ListRow icon={MapPin} title="Direcciones" to="/cuenta/direcciones" trailing={<Count n={addresses.length} />} />
          </ListGroup>
          <ListGroup title="Preferencias">
            <ListRow icon={Bell} title="Notificaciones" to="/cuenta/notificaciones" />
            <ListRow icon={Store} title="Sucursales" to="/sucursales" />
          </ListGroup>
          <ListGroup title="Soporte">
            <ListRow icon={CircleHelp} title="Ayuda" to="/cuenta/ayuda" />
          </ListGroup>
          <ListGroup>
            <ListRow icon={LogOut} title="Cerrar sesión" danger chevron={false} onClick={() => setConfirmOpen(true)} />
          </ListGroup>
          <p className="pb-4 text-center text-caption text-stone">
            ABRAHAM · versión {appConfig.version}
          </p>
        </div>
      </div>

      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="¿Cerrar sesión?"
        description="Se borrarán tus datos, direcciones, favoritos y pedidos guardados en este dispositivo."
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="dark" className="flex-1" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        }
      >
        <span />
      </BottomSheet>
    </div>
  );
}

function Count({ n }: { n: number }) {
  return n > 0 ? <span className="tabular text-callout text-stone">{n}</span> : null;
}
