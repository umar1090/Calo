/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig(({ mode }) => {
  // `vite build --mode artifact` makes one self-contained bundle for the hosted preview
  // (see scripts/build-artifact.mjs): everything inlined, no outside API calls.
  const artifact = mode === 'artifact';
  return {
    plugins: [react()],
    resolve: {
      alias: [
        ...(artifact ? [{ find: '@/lib/claudeCoach', replacement: src('lib/claudeCoach.preview.ts') }] : []),
        { find: '@', replacement: src('') },
      ],
    },
    build: artifact
      ? {
          outDir: 'dist-artifact',
          assetsInlineLimit: 10_000_000,
          cssCodeSplit: false,
          modulePreload: false,
          chunkSizeWarningLimit: 3000,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : {
          chunkSizeWarningLimit: 900,
          rollupOptions: {
            output: {
              manualChunks: {
                charts: ['recharts'],
                anthropic: ['@anthropic-ai/sdk'],
              },
            },
          },
        },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      testTimeout: 20000,
    },
  };
});
