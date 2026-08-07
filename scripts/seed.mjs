/**
 * Siembra la base con el catálogo existente del repo. Idempotente por slug:
 * no duplica si ya corriste el seed (los cambios hechos desde el admin se
 * respetan — solo inserta lo que falta).
 *
 * Migra:
 *  - categorías y productos desde data/catalogo.json (catálogo real de Fudo)
 *  - salsas/palitos de la categoría EXTRAS → tabla acompanamientos
 *    (y desactiva esos productos de la carta: ahora viven en el checkout)
 *  - grupos de modificadores de las promos desde db/fudo-modificadores.json
 *  - configuración inicial desde los valores actuales de config/negocio.ts
 *
 * Uso: DATABASE_URL=postgres://... node scripts/seed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "catalogo.json"), "utf8"));
const modsFudo = JSON.parse(
  fs.readFileSync(path.join(RAIZ, "db", "fudo-modificadores.json"), "utf8")
);

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

function slug(texto, sufijo = "") {
  const base = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return sufijo ? `${base}-${sufijo}` : base;
}

// ── Categorías ──────────────────────────────────────────────────────────
const mapaCategorias = {}; // id Fudo → id DB
for (const c of catalogo.categorias.data) {
  const s = slug(c.attributes.name);
  const r = await pool.query(
    `INSERT INTO categorias (nombre, slug, orden)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id`,
    [c.attributes.name, s, c.attributes.position]
  );
  mapaCategorias[c.id] = r.rows[0].id;
}
console.log(`Categorías: ${Object.keys(mapaCategorias).length}`);

// ── Productos ───────────────────────────────────────────────────────────
// Las salsas/palitos de EXTRAS pasan al paso de acompañamientos del checkout
const ID_CAT_EXTRAS_FUDO = "15";
const acompanamientosSeed = {
  67: { tipo: "salsa", maximo: 6 }, // WASABI
  74: { tipo: "palitos", maximo: 10 }, // PALITOS
  76: { tipo: "salsa", maximo: 6 }, // SALSA MARACUYA
  70: { tipo: "salsa", maximo: 10 }, // SALSA SOJA
  69: { tipo: "salsa", maximo: 6 }, // SALSA TERIYAKI
  73: { tipo: "otro", maximo: 10 }, // TENEDORES
  180: { tipo: "salsa", maximo: 6 }, // MOSTAZA Y MIEL
  261: { tipo: "salsa", maximo: 6 }, // Gengibre
};

const mapaProductos = {}; // id Fudo → id DB
let orden = 0;
for (const p of catalogo.productos.data) {
  const a = p.attributes;
  const categoriaDb = mapaCategorias[p.relationships.productCategory.data.id];
  // Productos de categorías inexistentes son solo modificadores de otras promos
  if (!categoriaDb) continue;
  const esAcompanamiento = Boolean(acompanamientosSeed[p.id]);
  const r = await pool.query(
    `INSERT INTO productos
       (categoria_id, nombre, slug, descripcion_corta, descripcion_larga,
        precio, imagen_url, activo, disponible, orden)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id`,
    [
      categoriaDb,
      a.name,
      slug(a.name, p.id),
      a.description ?? "",
      a.description ?? "",
      a.price,
      a.imageUrl ?? null,
      a.enabled !== false && !esAcompanamiento,
      a.active !== false,
      orden++,
    ]
  );
  mapaProductos[p.id] = r.rows[0].id;
}
console.log(`Productos: ${Object.keys(mapaProductos).length}`);

// ── Acompañamientos (salsas y palitos) ──────────────────────────────────
const { rows: yaHay } = await pool.query("SELECT count(*)::int AS n FROM acompanamientos");
if (yaHay[0].n === 0) {
  let ordenA = 0;
  for (const p of catalogo.productos.data) {
    const config = acompanamientosSeed[p.id];
    if (!config) continue;
    await pool.query(
      `INSERT INTO acompanamientos (nombre, tipo, precio, maximo, orden, imagen_url)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        p.attributes.name,
        config.tipo,
        p.attributes.price,
        config.maximo,
        ordenA++,
        p.attributes.imageUrl ?? null,
      ]
    );
  }
  console.log("Acompañamientos sembrados desde EXTRAS");
}

// ── Grupos de modificadores (promos de Fudo: elegí tus rolls) ───────────
const { rows: yaGrupos } = await pool.query(
  "SELECT count(*)::int AS n FROM grupos_modificadores"
);
if (yaGrupos[0].n === 0) {
  const nombrePorId = Object.fromEntries(modsFudo.products.map((p) => [p.id, p.name]));
  const gruposVistos = {}; // id grupo Fudo → id DB
  for (const p of modsFudo.products) {
    for (const g of p.productGroups) {
      if (!gruposVistos[g.id]) {
        const r = await pool.query(
          `INSERT INTO grupos_modificadores (nombre, minimo, maximo) VALUES ($1,$2,$3) RETURNING id`,
          [g.name.trim(), Math.round(g.minQuantity ?? 0), Math.round(g.maxQuantity ?? 1)]
        );
        gruposVistos[g.id] = r.rows[0].id;
        let ordenO = 0;
        for (const op of g.productGroupProducts ?? []) {
          await pool.query(
            `INSERT INTO opciones_modificador (grupo_id, nombre, precio_extra, orden)
             VALUES ($1,$2,$3,$4)`,
            [
              gruposVistos[g.id],
              nombrePorId[op.productId] ?? `Opción ${op.productId}`,
              Math.round(op.price ?? 0),
              ordenO++,
            ]
          );
        }
      }
      if (mapaProductos[p.id]) {
        await pool.query(
          `INSERT INTO producto_modificadores (producto_id, grupo_id)
           VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [mapaProductos[p.id], gruposVistos[g.id]]
        );
      }
    }
  }
  console.log(`Grupos de modificadores: ${Object.keys(gruposVistos).length}`);
}

// ── Configuración inicial (los valores vigentes de config/negocio.ts) ───
const configInicial = {
  costo_envio: 1000,
  pedido_minimo: 0,
  tiempo_delivery: "45 a 60 minutos",
  tiempo_retiro: "25 a 35 minutos",
  direccion_local: "Palermo, Buenos Aires (confirmá la dirección por WhatsApp)",
  upsell_activo: true,
  paso_acompanamientos_activo: true,
  horarios: {
    0: [ { desde: "10:30", hasta: "16:00" }, { desde: "18:00", hasta: "23:30" } ],
    1: [ { desde: "10:30", hasta: "23:30" } ],
    2: [ { desde: "10:30", hasta: "23:30" } ],
    3: [ { desde: "10:30", hasta: "23:30" } ],
    4: [ { desde: "10:30", hasta: "23:30" } ],
    5: [ { desde: "10:00", hasta: "16:00" } ],
    6: [ { desde: "20:45", hasta: "00:30" } ],
  },
};
for (const [clave, valor] of Object.entries(configInicial)) {
  await pool.query(
    `INSERT INTO configuracion (clave, valor) VALUES ($1, $2)
     ON CONFLICT (clave) DO NOTHING`,
    [clave, JSON.stringify(valor)]
  );
}
console.log("Configuración inicial lista.");

await pool.end();
console.log("Seed completo.");
