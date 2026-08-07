/**
 * Importa el menú real desde la página pública de Fudo del local
 * (https://menu.fu.do/abrahambagels): intercepta la API del menú con
 * Playwright, regenera data/catalogo.json y descarga las fotos de productos
 * a public/productos/.
 *
 * Uso:  node scripts/importar-catalogo-fudo.mjs
 * Requiere: npm i -D playwright  (o playwright instalado global)
 *
 * Correrlo cada vez que el menú cambie en Fudo (precios, productos, fotos).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, request } from "playwright";

const CUENTA = "abrahambagels";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMGDIR = path.join(RAIZ, "public", "productos");

// ── 1. Interceptar la API del menú ──────────────────────────────────────
const capturas = {};
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
// En entornos con proxy de egreso, la red del navegador puede estar cortada:
// se rutea todo por el stack de red de Node de Playwright.
const red = proxy
  ? await request.newContext({ proxy: { server: proxy }, ignoreHTTPSErrors: true })
  : null;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

async function registrar(url, cuerpo) {
  if (url.includes("/product-categories/")) capturas.categorias = JSON.parse(cuerpo);
  if (url.includes("/products/")) capturas.productos = JSON.parse(cuerpo);
}

if (red) {
  await context.route("**/*", async (ruta) => {
    try {
      const respuesta = await red.fetch(ruta.request(), { maxRedirects: 5 });
      const tipo = respuesta.headers()["content-type"] || "";
      if (tipo.includes("json")) await registrar(ruta.request().url(), await respuesta.text());
      await ruta.fulfill({ response: respuesta });
    } catch {
      await ruta.abort().catch(() => {});
    }
  });
} else {
  context.on("response", async (respuesta) => {
    try {
      const tipo = respuesta.headers()["content-type"] || "";
      if (tipo.includes("json")) await registrar(respuesta.url(), await respuesta.text());
    } catch {
      // respuestas ya cerradas se ignoran
    }
  });
}

const page = await context.newPage();
await page.goto(`https://menu.fu.do/${CUENTA}`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page.waitForTimeout(10_000);
await browser.close();

if (!capturas.categorias || !capturas.productos) {
  console.error("No se capturó la API del menú. ¿Cambió la URL o el formato de Fudo?");
  process.exit(1);
}
const categorias = capturas.categorias.productCategories;
const productos = capturas.productos.products;
console.log(`Capturado: ${categorias.length} categorías, ${productos.length} productos`);

// ── 2. Descargar imágenes ───────────────────────────────────────────────
fs.mkdirSync(IMGDIR, { recursive: true });
const bajador = red ?? (await request.newContext());

function extension(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  if (buffer.slice(8, 12).toString() === "WEBP") return "webp";
  return "jpg";
}

const rutasImagen = {};
let bajadas = 0;
for (const p of productos) {
  if (!p.image) continue;
  try {
    const r = await bajador.get(p.image, { timeout: 60_000 });
    if (!r.ok()) continue;
    const cuerpo = await r.body();
    if (cuerpo.length < 100) continue;
    const ext = extension(cuerpo);
    fs.writeFileSync(path.join(IMGDIR, `${p.id}.${ext}`), cuerpo);
    rutasImagen[p.id] = `/productos/${p.id}.${ext}`;
    bajadas++;
  } catch {
    // sin imagen: la card se muestra sin foto
  }
}
console.log(`Imágenes descargadas: ${bajadas}/${productos.filter((p) => p.image).length}`);

// ── 3. Generar data/catalogo.json (formato JSON:API de la app) ──────────
const catalogo = {
  _comentario:
    "Catálogo REAL de Abraham importado de la API pública del menú de Fudo. " +
    "Regenerar con: node scripts/importar-catalogo-fudo.mjs — cuando la API de " +
    "inyección esté habilitada, la capa de sincronización lo reemplaza.",
  categorias: {
    data: categorias
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        id: String(c.id),
        type: "ProductCategory",
        attributes: { name: c.name.trim(), position: c.position },
      })),
  },
  productos: {
    data: productos
      .slice()
      .sort(
        (a, b) =>
          a.productCategoryId - b.productCategoryId ||
          (a.position ?? 0) - (b.position ?? 0)
      )
      .map((p) => ({
        id: String(p.id),
        type: "Product",
        attributes: {
          name: p.name.trim(),
          description: (p.description ?? "").trim(),
          price: Math.round(p.priceDelivery ?? p.price),
          active: p.isAvailable !== false,
          enabled: p.sellAlone !== false,
          ...(rutasImagen[p.id] ? { imageUrl: rutasImagen[p.id] } : {}),
        },
        relationships: {
          productCategory: {
            data: { id: String(p.productCategoryId), type: "ProductCategory" },
          },
        },
      })),
  },
};

const salida = path.join(RAIZ, "data", "catalogo.json");
fs.writeFileSync(salida, JSON.stringify(catalogo, null, 1));
console.log(`Escrito ${salida} (${Math.round(fs.statSync(salida).size / 1024)} KB)`);

if (red) await red.dispose();
else await bajador.dispose();
