"use client";

/** Helper de fetch para el panel admin: JSON + manejo de errores uniforme. */
export async function apiAdmin<T = Record<string, unknown>>(
  ruta: string,
  opciones?: { metodo?: string; cuerpo?: unknown; formulario?: FormData }
): Promise<T & { ok: boolean; error?: string }> {
  try {
    const respuesta = await fetch(ruta, {
      method: opciones?.metodo ?? (opciones?.cuerpo || opciones?.formulario ? "POST" : "GET"),
      headers: opciones?.cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: opciones?.formulario ?? (opciones?.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined),
    });
    const datos = (await respuesta.json()) as T & { ok: boolean; error?: string };
    // Sesión vencida en una pantalla del panel → al login. Si ya estamos en el
    // login, el 401 es "contraseña incorrecta": se muestra el error, no se recarga.
    if (respuesta.status === 401 && !window.location.pathname.startsWith("/admin/login")) {
      window.location.href = "/admin/login";
    }
    return datos;
  } catch {
    return { ok: false, error: "Error de conexión. Probá de nuevo." } as T & {
      ok: boolean;
      error?: string;
    };
  }
}
