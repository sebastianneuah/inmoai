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
          DEFAULT: "#B80D0D", // rojo Abraham (el mismo de su página de Fudo)
          oscuro: "#8F0A0A", // estado presionado / hover
          claro: "#FDECEC", // fondos suaves de avisos
        },
        marfil: "#F7F6F4", // fondo de secciones
      },
    },
  },
  plugins: [],
};
export default config;
