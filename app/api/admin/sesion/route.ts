import { NextResponse } from "next/server";
import {
  autenticacionConfigurada,
  cerrarSesion,
  iniciarSesion,
  limpiarIntentos,
  permitirIntento,
  registrarIntentoFallido,
  usuarioAdmin,
} from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!autenticacionConfigurada()) {
    return NextResponse.json(
      { ok: false, error: "El admin no está configurado (faltan variables de entorno)." },
      { status: 503 }
    );
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!permitirIntento(ip)) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos. Esperá unos minutos." },
      { status: 429 }
    );
  }

  let cuerpo: { usuario?: string; password?: string };
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  if (iniciarSesion(String(cuerpo.usuario ?? ""), String(cuerpo.password ?? ""))) {
    limpiarIntentos(ip);
    return NextResponse.json({ ok: true });
  }
  registrarIntentoFallido(ip);
  return NextResponse.json(
    { ok: false, error: "Usuario o contraseña incorrectos." },
    { status: 401 }
  );
}

export async function DELETE() {
  cerrarSesion();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ usuario: usuarioAdmin() });
}
