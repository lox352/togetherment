import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Served at the root of the custom domain (https://244e13.com)
  base: "/",
  plugins: [react()],
});
