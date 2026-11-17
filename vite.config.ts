import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works at yahya-khamaisi.github.io/rift-insights/.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
