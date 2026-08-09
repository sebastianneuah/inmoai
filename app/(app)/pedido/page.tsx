import { obtenerAcompanamientos } from "@/lib/tienda/acompanamientos";
import { obtenerCatalogo } from "@/lib/tienda/catalogo";
import { obtenerConfig } from "@/lib/tienda/configuracion";
import { obtenerPublicidades } from "@/lib/tienda/publicidades";
import { FlujoCheckout } from "@/components/flujo-checkout";

export const dynamic = "force-dynamic";

export default async function PantallaPedido() {
  const [acompanamientos, catalogo, config, adCarrito] = await Promise.all([
    obtenerAcompanamientos(),
    obtenerCatalogo(),
    obtenerConfig(),
    obtenerPublicidades("carrito", 1),
  ]);

  // Cross-sell propio: bebidas, postres y entradas sin modificadores
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
      adCarrito={adCarrito[0]}
      config={{
        costoEnvio: config.costoEnvio,
        pedidoMinimo: config.pedidoMinimo,
        direccionLocal: config.direccionLocal,
        avisoTransferencia: "Tu pedido se prepara cuando recibimos el comprobante",
      }}
    />
  );
}
