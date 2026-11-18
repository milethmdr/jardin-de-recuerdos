import { defineConfig } from 'vite';

export default defineConfig({
  // sql.js es un módulo CommonJS; lo pre-empaquetamos para que funcione igual en dev y en producción.
  optimizeDeps: {
    include: ['sql.js'],
  },
  build: {
    target: 'es2020',
  },
});
