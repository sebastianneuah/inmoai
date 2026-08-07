import { Pool } from "pg";

/**
 * Pool de Postgres compartido. La app funciona en dos modos:
 *  - Con DATABASE_URL: catálogo, acompañamientos, pedidos y configuración
 *    viven en la base (Neon, Supabase o cualquier Postgres).
 *  - Sin DATABASE_URL: la carta se sirve del snapshot data/catalogo.json y el
 *    admin queda en modo solo lectura. Producción nunca se rompe por falta de DB.
 */

declare global {
  // eslint-disable-next-line no-var
  var __poolAbraham: Pool | undefined;
}

export function hayBaseDeDatos(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * ¿Esta conexión necesita SSL? Los Postgres administrados (Neon, Supabase)
 * lo exigen; uno local no lo soporta y falla si se lo forzamos. Se decide
 * por el host, respetando `sslmode=disable|require` si viene en la URL.
 */
export function requiereSsl(url: string): boolean {
  if (/sslmode=disable/i.test(url)) return false;
  if (/sslmode=(require|verify-full|verify-ca)/i.test(url)) return true;
  return !/@(localhost|127\.0\.0\.1|\[::1\]|::1)[:/]/i.test(url) && !url.includes("host=/");
}

export function db(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");

  // Reutilizamos el pool entre invocaciones calientes de la lambda
  if (!global.__poolAbraham) {
    global.__poolAbraham = new Pool({
      connectionString: url,
      max: 3,
      ssl: requiereSsl(url) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return global.__poolAbraham;
}
