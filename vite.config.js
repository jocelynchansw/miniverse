import { defineConfig } from "vite";

export default defineConfig({
  // relative asset paths so the build works at any URL,
  // including GitHub Pages project sites (…github.io/miniverse/)
  base: "./",
});
