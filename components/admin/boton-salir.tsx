"use client";

import { useRouter } from "next/navigation";
import { apiAdmin } from "@/components/admin/api";

export function BotonSalir() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await apiAdmin("/api/admin/sesion", { metodo: "DELETE" });
        router.push("/admin/login");
      }}
      className="min-h-10 rounded-full bg-white/10 px-4 text-sm font-bold"
    >
      Salir
    </button>
  );
}
