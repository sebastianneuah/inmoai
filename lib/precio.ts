/** Formateo de precios en pesos argentinos: $12.500 */
export function formatearPrecio(monto: number): string {
  return "$" + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(monto);
}
