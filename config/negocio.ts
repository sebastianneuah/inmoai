/**
 * ⚙️ CONFIGURACIÓN DEL NEGOCIO — único lugar a editar.
 *
 * Todo lo que el dueño puede querer cambiar vive acá:
 * horarios, pedido mínimo, costo de envío, tiempos, textos.
 * Las credenciales y datos sensibles van en variables de entorno (.env).
 */

export type RangoHorario = {
  /** Hora de apertura en formato "HH:MM" (24 hs) */
  desde: string;
  /** Hora de cierre en formato "HH:MM" (24 hs). Si es menor a `desde`, cruza medianoche. */
  hasta: string;
};

/** 0 = domingo, 1 = lunes … 6 = sábado (igual que Date.getDay()) */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const NEGOCIO = {
  nombre: "Abraham",
  descripcion: "Sushi kosher · Palermo, Buenos Aires",

  /** Zona horaria para calcular Abierto/Cerrado (no tocar salvo mudanza de país) */
  zonaHoraria: "America/Argentina/Buenos_Aires",

  /**
   * Horarios de atención por día de semana. Array vacío = cerrado todo el día.
   *
   * ⚠️ Shabat: el local cierra el viernes antes de la puesta del sol y reabre
   * el sábado a la noche. La puesta del sol cambia semana a semana, así que
   * estos horarios los ajusta el dueño acá (por ejemplo, cada viernes a la
   * mañana, o una vez por temporada con un margen de seguridad).
   */
  horarios: {
    0: [{ desde: "11:00", hasta: "23:00" }], // domingo
    1: [{ desde: "11:00", hasta: "23:00" }], // lunes
    2: [{ desde: "11:00", hasta: "23:00" }], // martes
    3: [{ desde: "11:00", hasta: "23:00" }], // miércoles
    4: [{ desde: "11:00", hasta: "23:00" }], // jueves
    5: [{ desde: "11:00", hasta: "16:30" }], // viernes: cierra antes de Shabat
    6: [{ desde: "21:30", hasta: "23:59" }], // sábado: reabre después de Shabat
  } as Record<DiaSemana, RangoHorario[]>,

  /** Nombres de los días para mostrar "abrimos el …" */
  nombresDias: [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ],

  entrega: {
    /** Pedido mínimo para delivery, en pesos. 0 = sin mínimo. */
    pedidoMinimoDelivery: 15000,

    /**
     * Costo de envío. Arranca con costo único; la estructura de zonas queda
     * lista para cuando se quiera cobrar distinto por barrio: agregar zonas
     * y el checkout las ofrece como selector.
     */
    envio: {
      /** Costo por defecto si no hay zonas o el cliente no eligió zona */
      costoUnico: 2500,
      /** Zonas opcionales: si el array tiene elementos, el cliente elige una. */
      zonas: [] as { id: string; nombre: string; costo: number }[],
    },

    /** Tiempo estimado que se muestra en la confirmación */
    tiempoEstimado: {
      delivery: "45 a 60 minutos",
      retiro: "25 a 35 minutos",
    },

    /** Dirección del local, para quien elige retiro */
    direccionLocal: "Palermo, Buenos Aires (confirmá la dirección por WhatsApp)",
  },

  textos: {
    avisoTransferencia: "Tu pedido se prepara cuando recibimos el comprobante",
    notaEsperaComprobante: "ESPERA COMPROBANTE",
  },
} as const;

/**
 * Datos que viven en variables de entorno pero se muestran al cliente.
 * Se leen SOLO en el servidor (API); el frontend los recibe en la respuesta
 * de la creación del pedido. Así no hay que duplicarlos en el código.
 */
export function datosPagoDesdeEntorno() {
  return {
    aliasMp: process.env.ALIAS_MP ?? "",
    whatsappNumero: process.env.WHATSAPP_NUMERO ?? "",
  };
}
