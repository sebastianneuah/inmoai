import type { Metadata, Viewport } from "next";
import { ProveedorCarrito } from "@/components/carrito";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABRAHAM — Sushi Kosher en Buenos Aires",
  description:
    "Pedí sushi kosher online en Abraham. Delivery y retiro en Palermo, Buenos Aires.",
  applicationName: "Abraham Pedidos",
  appleWebApp: {
    capable: true,
    title: "ABRAHAM",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icono-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ABRAHAM — Sushi Kosher en Buenos Aires",
    description:
      "Pedí sushi kosher online en Abraham. Delivery y retiro en Palermo, Buenos Aires.",
    type: "website",
    locale: "es_AR",
    siteName: "Abraham Pedidos",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // La app no se escala: se comporta como una aplicación, no como una página
  maximumScale: 5,
  themeColor: "#141414",
  viewportFit: "cover",
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
