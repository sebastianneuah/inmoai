import type { Metadata, Viewport } from "next";
import { NEGOCIO } from "@/config/negocio";
import { ProveedorCarrito } from "@/components/carrito";
import "./globals.css";

export const metadata: Metadata = {
  title: `${NEGOCIO.nombre} — Pedidos online`,
  description: `${NEGOCIO.descripcion}. Pedí online: delivery o retiro por el local.`,
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
