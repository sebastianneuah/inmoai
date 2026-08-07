"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiAdmin } from "@/components/admin/api";

export default function LoginAdmin() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const r = await apiAdmin("/api/admin/sesion", { cuerpo: { usuario, password } });
    if (r.ok) {
      router.push("/admin");
    } else {
      setError(r.error ?? "No pudimos iniciar sesión.");
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-tinta px-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-black">
          ABRAHAM<span className="text-fuego">.</span>
        </h1>
        <p className="text-sm text-tinta-suave">Panel administrativo</p>

        <label className="mt-5 block">
          <span className="text-sm font-bold">Usuario</span>
          <input
            type="text"
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-sm font-bold">Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3"
          />
        </label>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-fuego-claro px-3 py-2 text-sm font-bold text-fuego">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || !usuario || !password}
          className="mt-4 min-h-12 w-full rounded-xl bg-fuego font-black text-white disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
