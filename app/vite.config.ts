import { defineConfig } from 'vite';

// The canonical library lives one level up; serve it at the web root so the app can
// fetch /index.json and /charts/<id>.cho directly (and it ships with a static build).
export default defineConfig({
  publicDir: '../library',
});
