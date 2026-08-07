/** Tipos de dominio compartidos entre frontend y backend. */

export type Categoria = {
  id: string;
  nombre: string;
  orden: number;
};

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoriaId: string;
  /** true = se muestra como "Agotado" y no se puede agregar */
  agotado: boolean;
  imagen?: string;
};

export type Catalogo = {
  categorias: Categoria[];
  productos: Producto[];
};

export type ModoEntrega = "delivery" | "retiro";
export type MetodoPago = "efectivo" | "transferencia";

export type ItemCarrito = {
  productoId: string;
  cantidad: number;
  /** Aclaración por ítem: "sin verdeo", etc. */
  aclaracion?: string;
};

/** Lo que el navegador manda a POST /api/pedidos */
export type PedidoEntrante = {
  /** Clave generada por el cliente para evitar pedidos duplicados por doble tap */
  claveIdempotencia: string;
  modoEntrega: ModoEntrega;
  /** Zona de envío elegida (solo si hay zonas configuradas y es delivery) */
  zonaId?: string;
  items: ItemCarrito[];
  aclaracionGeneral?: string;
  /**
   * Total que el cliente vio al confirmar. Si el servidor recalcula otro
   * (cambió el catálogo), rechaza con los precios nuevos en vez de cobrar
   * distinto sin avisar.
   */
  totalEsperado: number;
  cliente: {
    nombre: string;
    telefono: string;
    direccion?: string;
    referencias?: string;
  };
  pago:
    | { metodo: "efectivo"; pagaCon: number | "justo" }
    | { metodo: "transferencia" };
};

/** Ítem ya validado y precificado por el servidor */
export type ItemConfirmado = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  aclaracion?: string;
};

/** Lo que el servidor devuelve al confirmar (y lo que guarda la confirmación) */
export type PedidoConfirmado = {
  numero: string;
  modoEntrega: ModoEntrega;
  /** Nombre de la zona de envío, si el negocio cobra por zonas */
  zonaEnvio?: string;
  items: ItemConfirmado[];
  aclaracionGeneral?: string;
  cliente: PedidoEntrante["cliente"];
  pago: PedidoEntrante["pago"];
  subtotal: number;
  costoEnvio: number;
  total: number;
  /** Vuelto calculado si paga en efectivo con billete */
  vuelto: number;
  tiempoEstimado: string;
  /** true si la inyección a Fudo falló y hay que avisar al local por WhatsApp */
  falloInyeccion: boolean;
  datosPago: {
    aliasMp: string;
    whatsappNumero: string;
  };
  creadoEn: string;
};

export type RespuestaApiPedidos =
  | { ok: true; pedido: PedidoConfirmado }
  | {
      ok: false;
      error: string;
      /** Presente cuando el catálogo cambió: el cliente actualiza su carrito */
      preciosActualizados?: { productoId: string; precio: number }[];
      /** Presente cuando el costo de envío vigente difiere del que vio el cliente */
      costoEnvioActualizado?: number;
    };
