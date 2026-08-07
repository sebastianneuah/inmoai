import { obtenerAcompanamientos } from "@/lib/tienda/acompanamientos";
import { obtenerCatalogo } from "@/lib/tienda/catalogo";
import { obtenerConfig } from "@/lib/tienda/configuracion";
import { estaAbierto, proximaApertura } from "@/lib/horarios";
import { FlujoCheckout } from "@/components/flujo-checkout";

// Igual que la home: render por visita, datos cacheados por tag (ver app/page.tsx)
export const dynamic = "force-dynamic";

export default async function PaginaCheckout() {
  const [acompanamientos, catalogo, config] = await Promise.all([
    obtenerAcompanamientos(),
    obtenerCatalogo(),
    obtenerConfig(),
  ]);

  // Upsell: bebidas, postres y entradas para el "¿querés agregar algo más?"
  const sugeridos = config.upsellActivo
    ? catalogo.productos
        .filter((p) => {
          const categoria = catalogo.categorias.find((c) => c.id === p.categoriaId);
          return (
            !p.agotado &&
            p.grupos.length === 0 &&
            /bebida|postre|entrada/i.test(categoria?.nombre ?? "")
          );
        })
        .slice(0, 8)
    : [];

  return (
    <FlujoCheckout
      acompanamientos={config.pasoAcompanamientosActivo ? acompanamientos : []}
      sugeridos={sugeridos}
      config={{
        costoEnvio: config.costoEnvio,
        pedidoMinimo: config.pedidoMinimo,
        direccionLocal: config.direccionLocal,
        avisoTransferencia: "Tu pedido se prepara cuando recibimos el comprobante",
      }}
      horarios={config.horarios}
      estadoInicial={{
        abierto: estaAbierto(config.horarios),
        proxima: proximaApertura(config.horarios),
      }}
    />
  );
}
