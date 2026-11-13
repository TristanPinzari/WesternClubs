// WHAT: Settings for Vite, the tool that runs the frontend dev server and builds it for
//   production. Turns on React and Tailwind, and forwards /api requests to the backend.
// WITHOUT IT: JSX and Tailwind classes wouldn't work, and API calls in dev would 404.
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, forward /api to Express so the browser sees one origin (same as Vercel in prod).
    proxy: { "/api": "http://localhost:3000" },
  },
});
