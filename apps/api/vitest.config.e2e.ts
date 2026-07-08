import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globals: true,
    environment: 'node',
  },
  esbuild: false,
  oxc: false,
});
