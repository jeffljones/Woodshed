import { defineConfig } from 'vite';

// The canonical library lives one level up; serve it at the web root so the app can
// fetch /index.json and /charts/<id>.cho directly (and it ships with a static build).
export default defineConfig(({ command }) => ({
  // On GitHub Pages the app is served from /<repo>/, so the production build needs that
  // base path. Dev keeps '/' for a clean localhost.
  base: command === 'build' ? '/woodshed/' : '/',
  publicDir: '../library',
}));
