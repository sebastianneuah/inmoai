"use client";

import type { Publicidad } from "@/lib/tienda/publicidades";
import { BannerPublicidad } from "@/components/app/publicidad";
import { BarraPedido } from "@/components/app/barra-pedido";

/**
 * Beneficios: promociones de Abraham, cupones, marcas asociadas y sponsors.
 * Todas las tarjetas salen del módulo de publicidades, así el dueño arma la
 * sección sin tocar código.
 */
export function PantallaBeneficios({ beneficios }: { beneficios: Publicidad[] }) {
  return (
    <main className="mx-auto max-w-2xl pt-4">
      <header className="px-4">
        <h1 className="text-2xl font-black">Beneficios</h1>
        <p className="mt-0.5 text-sm text-tinta-suave">
          Promos de Abraham y de nuestras marcas amigas.
        </p>
      </header>

      {beneficios.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="text-4xl" aria-hidden>
            🎁
          </p>
          <p className="mt-3 font-bold">Todavía no hay beneficios activos</p>
          <p className="mt-1 text-sm text-tinta-suave">
            Volvé pronto: siempre hay algo nuevo dando vueltas.
          </p>
        </div>
      ) : (
        <div className="pt-1">
          {beneficios.map((beneficio) => (
            <BannerPublicidad key={beneficio.id} publicidad={beneficio} slot="beneficios" />
          ))}
        </div>
      )}

      <BarraPedido />
    </main>
  );
}
