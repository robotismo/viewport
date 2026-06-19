import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

// base: './' emits relative asset URLs so the build works on any host path,
// including a GitHub Pages project subpath (/<repo>/).
export default defineConfig({
  base: './',
  plugins: [
    glsl({
      removeDuplicatedImports: true,
      warnDuplicatedImports: false,
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
