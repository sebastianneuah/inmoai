/** Teléfono argentino: dígitos con o sin +54 / 15, entre 10 y 13 dígitos */
export function telefonoValido(telefono: string): boolean {
  const digitos = telefono.replace(/[\s\-().+]/g, "");
  return /^\d{10,13}$/.test(digitos);
}
