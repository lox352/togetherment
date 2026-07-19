import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves the site at https://<user>.github.io/togetherment/
  base: "/togetherment/",
  plugins: [react()],
});
