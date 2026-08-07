import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sinSesion } from "@/lib/admin/guardia";

export const dynamic = "force-dynamic";

const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const TAMANO_MAXIMO = 4 * 1024 * 1024; // 4 MB

/**
 * Subida de imágenes de productos a Vercel Blob (almacenamiento persistente).
 * Valida tipo y tamaño server-side. Devuelve la URL pública.
 */
export async function POST(request: Request) {
  const bloqueo = sinSesion();
  if (bloqueo) return bloqueo;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "Falta BLOB_READ_WRITE_TOKEN: conectá el Blob store al proyecto." },
      { status: 503 }
    );
  }

  const formulario = await request.formData();
  const archivo = formulario.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ ok: false, error: "Falta el archivo." }, { status: 400 });
  }
  const extension = TIPOS_PERMITIDOS[archivo.type];
  if (!extension) {
    return NextResponse.json(
      { ok: false, error: "Formato no permitido: usá JPG, PNG, WebP o AVIF." },
      { status: 400 }
    );
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return NextResponse.json(
      { ok: false, error: "La imagen supera los 4 MB. Achicala antes de subirla." },
      { status: 400 }
    );
  }

  const nombre = `productos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const subida = await put(nombre, archivo, {
    access: "public",
    contentType: archivo.type,
  });
  return NextResponse.json({ ok: true, url: subida.url });
}
