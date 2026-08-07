/**
 * Aplica las migraciones de db/migraciones/ en orden, registrando cuáles ya
 * corrieron. Idempotente: correrlo dos veces no rompe nada.
 *
 * Uso: DATABASE_URL=postgres://... node scripts/migrar.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(RAIZ, "db", "migraciones");

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}
// Los Postgres administrados exigen SSL; uno local falla si se lo forzamos
const url = process.env.DATABASE_URL;
const necesitaSsl =
  !/sslmode=disable/i.test(url) &&
  (/sslmode=(require|verify-full|verify-ca)/i.test(url) ||
    (!/@(localhost|127\.0\.0\.1|\[::1\]|::1)[:/]/i.test(url) && !url.includes("host=/")));
const pool = new pg.Pool({
  connectionString: url,
  ssl: necesitaSsl ? { rejectUnauthorized: false } : undefined,
});

await pool.query(`CREATE TABLE IF NOT EXISTS migraciones (
  nombre TEXT PRIMARY KEY, aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
)`);

const aplicadas = new Set(
  (await pool.query("SELECT nombre FROM migraciones")).rows.map((r) => r.nombre)
);

for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) {
  if (aplicadas.has(archivo)) {
    console.log(`✓ ${archivo} (ya aplicada)`);
    continue;
  }
  const sql = fs.readFileSync(path.join(DIR, archivo), "utf8");
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query(sql);
    await cliente.query("INSERT INTO migraciones (nombre) VALUES ($1)", [archivo]);
    await cliente.query("COMMIT");
    console.log(`✚ ${archivo} aplicada`);
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error(`✗ ${archivo} falló:`, error.message);
    process.exit(1);
  } finally {
    cliente.release();
  }
}
await pool.end();
console.log("Migraciones al día.");
