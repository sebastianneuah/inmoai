import type { MetadataRoute } from "next";

/**
 * Manifest de la PWA: al agregar Abraham a la pantalla de inicio se abre en
 * modo standalone (sin barra del navegador) y se siente como una app.
 *
 * A propósito NO hay service worker: evita que alguien vea un menú viejo
 * servido desde caché, que en un restaurante es peor que tardar un segundo más.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Abraham Pedidos",
    short_name: "ABRAHAM",
    description: "Sushi kosher en Palermo, Buenos Aires. Delivery y retiro.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#141414",
    theme_color: "#141414",
    lang: "es-AR",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
