import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'MagObsidianModule',
      fileName: () => 'mag-obsidian-module.js',
      formats: ['es']
    },
    rollupOptions: {
      output: {
        assetFileNames: 'style.css'
      }
    }
  }
});
