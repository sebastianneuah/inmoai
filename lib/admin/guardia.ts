import { NextResponse } from "next/server";
import { usuarioAdmin } from "@/lib/admin/auth";
import { hayBaseDeDatos } from "@/lib/db";

/** Guardas compartidas por todas las APIs del admin. */

export function sinSesion(): NextResponse | null {
  if (!usuarioAdmin()) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  return null;
}

export function sinBase(): NextResponse | null {
  if (!hayBaseDeDatos()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Base de datos no conectada: el admin está en modo solo lectura. Configurá DATABASE_URL.",
      },
      { status: 503 }
    );
  }
  return null;
}

/** Sesión + base, el combo que usan casi todas las rutas de escritura. */
export function guardar(): NextResponse | null {
  return sinSesion() ?? sinBase();
}
