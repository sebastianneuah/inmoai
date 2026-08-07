/**
 * Genera el hash de la contraseña del admin para ADMIN_PASSWORD_HASH.
 * Uso: node scripts/generar-hash-admin.mjs "mi-contraseña-segura"
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error("Uso: node scripts/generar-hash-admin.mjs \"contraseña\" (mínimo 8 caracteres)");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32);
console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
console.log("\nAgregala como variable de entorno junto con ADMIN_USUARIO y SESSION_SECRET.");
console.log(`Sugerencia de SESSION_SECRET: ${randomBytes(24).toString("hex")}`);
