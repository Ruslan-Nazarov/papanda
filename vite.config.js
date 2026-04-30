import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './',
  build: {
    outDir: 'fastapi_app/static/dist',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'fastapi_app/static/js/smart_notes.js'),
      formats: ['es'],
      fileName: () => 'smart_notes.bundle.js'
    },
    rollupOptions: {
      // Мы НЕ помечаем зависимости как внешние, чтобы Vite запаковал их в бандл
      external: [],
    }
  }
});
