import type { Config } from "tailwindcss";

// Identidad Abraham: rojo y negro sobre base blanca.
// Un solo color de acción (rojo) para que el CTA sea imposible de perder.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tinta: {
          DEFAULT: "#141414", // negro estructural (barra, títulos)
          suave: "#3d3d3d",
        },
        fuego: {
          DEFAULT: "#C8102E", // rojo Abraham: CTAs, precios, badges
          oscuro: "#A00D25", // estado presionado / hover
          claro: "#FDECEE", // fondos suaves de avisos
        },
        marfil: "#F7F6F4", // fondo de secciones
      },
    },
  },
  plugins: [],
};
export default config;
