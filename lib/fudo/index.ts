import { clienteMock } from "@/lib/fudo/mock";
import { clienteReal } from "@/lib/fudo/client";
import type { ClienteFudo } from "@/lib/fudo/types";

/**
 * Selector de cliente Fudo según FUDO_MODE:
 *  - "mock" (por defecto): simula la inyección, no llama a ninguna API.
 *  - "live": usa las credenciales reales (FUDO_CLIENT_ID / FUDO_CLIENT_SECRET).
 */
export function obtenerClienteFudo(): ClienteFudo {
  return process.env.FUDO_MODE === "live" ? clienteReal : clienteMock;
}
