import { obtenerConfig } from "@/lib/tienda/configuracion";
import { estaAbierto, proximaApertura } from "@/lib/horarios";
import { HeaderApp } from "@/components/app/header-app";
import { BottomNav } from "@/components/app/bottom-nav";
import { EstadoLocal } from "@/components/app/estado-local";
import { AvisoInstalar } from "@/components/app/aviso-instalar";

/**
 * App Shell: header compacto arriba, contenido en el medio y navegación
 * inferior fija. Esta estructura no se desmonta al cambiar de pestaña, así
 * la navegación se siente instantánea como en una app nativa.
 *
 * El proveedor de estado del local envuelve TODO el shell: el header y el
 * checkout tienen que ver exactamente lo mismo sobre si está abierto.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const config = await obtenerConfig();
  const abierto = estaAbierto(config.horarios);
  const proxima = proximaApertura(config.horarios);

  return (
    <EstadoLocal horarios={config.horarios} inicial={{ abierto, proxima }}>
      <div className="flex min-h-screen flex-col bg-marfil">
        <HeaderApp
          abierto={abierto}
          proxima={proxima}
          tiempoDelivery={config.tiempoDelivery}
          tiempoRetiro={config.tiempoRetiro}
          direccionLocal={config.direccionLocal}
        />

        {/* pb-20 deja lugar a la bottom nav; el safe-area lo agrega la nav */}
        <div className="flex-1 pb-20">{children}</div>

        <BottomNav />
        <AvisoInstalar />
      </div>
    </EstadoLocal>
  );
}
