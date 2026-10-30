import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // 'server-only' só existe para o bundler do Next; nos testes vira um módulo vazio.
      'server-only': fileURLToPath(new URL('./tests/vazio.ts', import.meta.url)),
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
