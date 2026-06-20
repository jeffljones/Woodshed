import { defineConfig } from 'vite';

// The canonical library lives one level up; serve it at the web root so the app can
// fetch /index.json and /charts/<id>.cho directly (and it ships with a static build).
export default defineConfig(({ command }) => ({
  // Relative base so the build works under any GitHub Pages project path (/<repo>/),
  // regardless of the repo's name or letter case. Dev keeps '/' for a clean localhost.
  base: command === 'build' ? './' : '/',
  publicDir: '../library',
}));
