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
  /**
   * Hora de cierre en formato "HH:MM" (24 hs). Para cerrar a medianoche usar
   * "24:00". Si es menor a `desde`, el rango cruza medianoche (ej. 21:00 a 01:00).
   */
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
  // Horarios reales importados de la página de Fudo del local (delivery)
  horarios: {
    0: [
      { desde: "10:30", hasta: "16:00" },
      { desde: "18:00", hasta: "23:30" },
    ], // domingo
    1: [{ desde: "10:30", hasta: "23:30" }], // lunes
    2: [{ desde: "10:30", hasta: "23:30" }], // martes
    3: [{ desde: "10:30", hasta: "23:30" }], // miércoles
    4: [{ desde: "10:30", hasta: "23:30" }], // jueves
    5: [{ desde: "10:00", hasta: "16:00" }], // viernes: cierra antes de Shabat
    6: [{ desde: "20:45", hasta: "00:30" }], // sábado: reabre después de Shabat (cruza medianoche)
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
    /** Pedido mínimo para delivery, en pesos. 0 = sin mínimo (así lo tiene hoy el local en Fudo). */
    pedidoMinimoDelivery: 0,

    /**
     * Costo de envío. Arranca con costo único; la estructura de zonas queda
     * lista para cuando se quiera cobrar distinto por barrio: agregar zonas
     * y el checkout las ofrece como selector.
     */
    envio: {
      /** Costo por defecto si no hay zonas o el cliente no eligió zona (valor actual del local en Fudo) */
      costoUnico: 1000,
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
