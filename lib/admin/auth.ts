import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Autenticación del panel admin, 100% server-side y sin dependencias:
 *
 *  - Credenciales: ADMIN_USUARIO + ADMIN_PASSWORD_HASH (scrypt) en variables
 *    de entorno. La contraseña JAMÁS existe en texto plano en el código ni
 *    llega al navegador. Generar el hash con:
 *      node scripts/generar-hash-admin.mjs "mi-contraseña"
 *  - Sesión: cookie HttpOnly firmada con HMAC-SHA256 (SESSION_SECRET),
 *    con vencimiento de 12 horas.
 *  - Rate limiting básico en memoria contra fuerza bruta.
 */

const COOKIE_SESION = "abraham_admin";
const DURACION_SESION_MS = 12 * 60 * 60 * 1000;

function secreto(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET no configurada (mínimo 16 caracteres)");
  }
  return s;
}

export function autenticacionConfigurada(): boolean {
  return Boolean(
    process.env.ADMIN_USUARIO &&
      process.env.ADMIN_PASSWORD_HASH &&
      process.env.SESSION_SECRET
  );
}

// ── Verificación de contraseña (scrypt) ─────────────────────────────────

/** Formato del hash: scrypt:<salt-hex>:<hash-hex> */
export function hashearPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verificarPassword(password: string, hashGuardado: string): boolean {
  const partes = hashGuardado.split(":");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;
  const salt = Buffer.from(partes[1], "hex");
  const esperado = Buffer.from(partes[2], "hex");
  const calculado = scryptSync(password, salt, esperado.length);
  return timingSafeEqual(calculado, esperado);
}

// ── Rate limiting básico ────────────────────────────────────────────────

/**
 * Solo se cuentan los intentos FALLIDOS, y un login exitoso limpia el
 * contador: así el freno actúa contra la fuerza bruta sin castigar a alguien
 * que entra y sale varias veces en el día.
 */
const intentosFallidos = new Map<string, { cantidad: number; desde: number }>();
const MAX_INTENTOS = 8;
const VENTANA_MS = 10 * 60 * 1000;

export function permitirIntento(ip: string): boolean {
  const registro = intentosFallidos.get(ip);
  if (!registro) return true;
  if (Date.now() - registro.desde > VENTANA_MS) {
    intentosFallidos.delete(ip);
    return true;
  }
  return registro.cantidad < MAX_INTENTOS;
}

export function registrarIntentoFallido(ip: string) {
  const ahora = Date.now();
  const registro = intentosFallidos.get(ip);
  if (!registro || ahora - registro.desde > VENTANA_MS) {
    intentosFallidos.set(ip, { cantidad: 1, desde: ahora });
  } else {
    registro.cantidad++;
  }
}

export function limpiarIntentos(ip: string) {
  intentosFallidos.delete(ip);
}

// ── Sesión firmada ──────────────────────────────────────────────────────

function firmar(datos: string): string {
  return createHmac("sha256", secreto()).update(datos).digest("hex");
}

function tokenDeSesion(usuario: string): string {
  const vence = Date.now() + DURACION_SESION_MS;
  const cuerpo = `${usuario}.${vence}`;
  return `${Buffer.from(cuerpo).toString("base64url")}.${firmar(cuerpo)}`;
}

function validarToken(token: string): string | null {
  const [cuerpoB64, firma] = token.split(".");
  if (!cuerpoB64 || !firma) return null;
  const cuerpo = Buffer.from(cuerpoB64, "base64url").toString();
  const firmaEsperada = firmar(cuerpo);
  if (
    firma.length !== firmaEsperada.length ||
    !timingSafeEqual(Buffer.from(firma), Buffer.from(firmaEsperada))
  ) {
    return null;
  }
  const ultimoPunto = cuerpo.lastIndexOf(".");
  const usuario = cuerpo.slice(0, ultimoPunto);
  const vence = Number(cuerpo.slice(ultimoPunto + 1));
  if (!Number.isFinite(vence) || Date.now() > vence) return null;
  return usuario;
}

// ── API para rutas y páginas ────────────────────────────────────────────

export function iniciarSesion(usuario: string, password: string): boolean {
  if (!autenticacionConfigurada()) return false;
  if (usuario !== process.env.ADMIN_USUARIO) return false;
  if (!verificarPassword(password, process.env.ADMIN_PASSWORD_HASH!)) return false;

  cookies().set(COOKIE_SESION, tokenDeSesion(usuario), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_MS / 1000,
  });
  return true;
}

export function cerrarSesion() {
  cookies().delete(COOKIE_SESION);
}

/** Devuelve el usuario admin logueado, o null. Para páginas y APIs. */
export function usuarioAdmin(): string | null {
  const token = cookies().get(COOKIE_SESION)?.value;
  if (!token) return null;
  try {
    return validarToken(token);
  } catch {
    return null;
  }
}
