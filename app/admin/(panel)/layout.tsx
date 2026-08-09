import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAdmin } from "@/lib/admin/auth";
import { hayBaseDeDatos } from "@/lib/db";
import { BotonSalir } from "@/components/admin/boton-salir";

export const dynamic = "force-dynamic";

const SECCIONES = [
  ["/admin", "Inicio"],
  ["/admin/productos", "Productos"],
  ["/admin/categorias", "Categorías"],
  ["/admin/acompanamientos", "Acompañamientos"],
  ["/admin/ads", "Publicidades"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/configuracion", "Configuración"],
] as const;

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  if (!usuarioAdmin()) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-marfil">
      <header className="bg-tinta text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-black">
            ABRAHAM<span className="text-fuego">.</span>{" "}
            <span className="text-sm font-bold text-white/60">admin</span>
          </Link>
          <BotonSalir />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 sin-scrollbar">
          {SECCIONES.map(([ruta, nombre]) => (
            <Link
              key={ruta}
              href={ruta}
              className="min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/10"
            >
              {nombre}
            </Link>
          ))}
        </nav>
      </header>
      {!hayBaseDeDatos() && (
        <p className="bg-fuego px-4 py-2 text-center text-sm font-bold text-white">
          ⚠️ Base de datos no conectada: modo solo lectura. Configurá DATABASE_URL y corré
          las migraciones para habilitar la edición.
        </p>
      )}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
