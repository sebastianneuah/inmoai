import type { Metadata, Viewport } from "next";
import { NEGOCIO } from "@/config/negocio";
import { ProveedorCarrito } from "@/components/carrito";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABRAHAM — Sushi Kosher en Buenos Aires",
  description:
    "Pedí sushi kosher online en Abraham. Delivery y retiro en Palermo, Buenos Aires.",
  applicationName: "Abraham Pedidos",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Abraham Pedidos", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "ABRAHAM — Sushi Kosher en Buenos Aires",
    description:
      "Pedí sushi kosher online en Abraham. Delivery y retiro en Palermo, Buenos Aires.",
    type: "website",
    locale: "es_AR",
    siteName: NEGOCIO.nombre,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#141414",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>
        <ProveedorCarrito>{children}</ProveedorCarrito>
      </body>
    </html>
  );
}
