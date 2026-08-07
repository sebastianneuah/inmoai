import { NextResponse } from "next/server";

/**
 * Manifest para "agregar a pantalla de inicio". Sin service worker a
 * propósito: evita servir versiones viejas del menú desde caché.
 */
export function GET() {
  return NextResponse.json({
    name: "Abraham Pedidos",
    short_name: "Abraham",
    description: "Sushi kosher en Palermo, Buenos Aires. Delivery y retiro.",
    start_url: "/",
    display: "standalone",
    background_color: "#B80D0D",
    theme_color: "#141414",
    lang: "es-AR",
    icons: [
      { src: "/icono.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  });
}
