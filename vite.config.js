import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Set this to the exact name of your GitHub repository (case-sensitive).
  // e.g. if your repo is github.com/user/vault-app, use "/vault-app/".
  // For a root user.github.io deployment, use "/".
  base: "/Vault/",
  plugins: [react()],
});
