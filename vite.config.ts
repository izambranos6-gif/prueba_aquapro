import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],

  // Codespaces / desarrollo
  // GitHub Pages / producción
  base: command === 'serve' ? '/' : '/prueba_aquapro/',
}));