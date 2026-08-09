"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCarrito } from "@/components/carrito";
import {
  IconoBeneficios,
  IconoBuscar,
  IconoCuenta,
  IconoInicio,
  IconoPedido,
} from "@/components/app/iconos";

/**
 * Navegación inferior fija, como una app nativa. Respeta el área segura de
 * los iPhone con notch/Dynamic Island para no quedar debajo de la barra del
 * sistema. La navegación es cliente-a-cliente (Link), sin recargar la app.
 */

type Tab = {
  ruta: string;
  etiqueta: string;
  Icono: (props: { className?: string; relleno?: boolean }) => JSX.Element;
  /** Solo la pestaña Pedido lleva el contador de ítems */
  conBadge?: boolean;
};

const TABS: Tab[] = [
  { ruta: "/", etiqueta: "Inicio", Icono: IconoInicio },
  { ruta: "/buscar", etiqueta: "Buscar", Icono: IconoBuscar },
  { ruta: "/pedido", etiqueta: "Pedido", Icono: IconoPedido, conBadge: true },
  { ruta: "/beneficios", etiqueta: "Beneficios", Icono: IconoBeneficios },
  { ruta: "/cuenta", etiqueta: "Cuenta", Icono: IconoCuenta },
];

export function BottomNav() {
  const ruta = usePathname();
  const { cantidadTotal, listo } = useCarrito();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map(({ ruta: destino, etiqueta, Icono, conBadge }) => {
          const activa = destino === "/" ? ruta === "/" : ruta.startsWith(destino);
          return (
            <li key={destino} className="flex-1">
              <Link
                href={destino}
                aria-current={activa ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-bold transition-colors ${
                  activa ? "text-fuego" : "text-tinta-suave"
                }`}
              >
                <span className="relative">
                  <Icono className="h-6 w-6" relleno={activa} />
                  {conBadge && listo && cantidadTotal > 0 && (
                    <span className="absolute -right-2.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-fuego px-1 text-[10px] font-black text-white">
                      {cantidadTotal}
                    </span>
                  )}
                </span>
                {etiqueta}
                {activa && (
                  <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-fuego" aria-hidden />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
