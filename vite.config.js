import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // 👇 Cámbialo por el nombre EXACTO de tu repositorio en GitHub (sensible a mayúsculas).
  // Ej. si tu repo es github.com/usuario/vault-app, deja "/vault-app/".
  // Si vas a publicar en usuario.github.io (repo raíz), usa "/".
  base: "/vault-app/",
  plugins: [react()],
});
