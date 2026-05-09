npm init -y
npm install -D typescript vite tailwindcss postcss autoprefixer jszip @types/node @tailwindcss/postcss @tailwindcss/vite vitest @vitest/ui jsdom --legacy-peer-deps
npm i html-to-md turndown turndown-plugin-gfm js-yaml jszip --legacy-peer-deps
npm i -D @league-of-foundry-developers/foundry-vtt-types @types/turndown @types/js-yaml --legacy-peer-deps
mkdir src src/styles src/ui src/templates src/export

cat > .gitignore << 'IG'
node_modules/
dist/
build/
.env
IG

cat > vite.config.ts << 'VC'
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
VC

cat > postcss.config.mjs << 'PC'
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
PC

cat > tsconfig.json << 'TC'
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "Node16",
    "moduleResolution": "node16",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "types": ["@league-of-foundry-developers/foundry-vtt-types"]
  },
  "include": ["src/**/*.ts"]
}
TC

cat > vitest.config.ts << 'VTC'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
VTC

npm pkg set scripts.build="vite build && cp src/module.json dist/ && cp -r src/templates dist/"
npm pkg set scripts.dev="vite build --watch"
npm pkg set scripts.test="vitest run"
