import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PORT=3151 npx vite  → http://localhost:3151/?film=<slug>&format=v|h|sq|p
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: Number(process.env.PORT ?? 3151), strictPort: true },
});
