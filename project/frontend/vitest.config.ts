import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    slowTestThreshold: 1000,
    maxThreads: 4,
    minThreads: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/setup.ts',
        'src/__tests__/setup.ts',
        'src/__tests__/**',
        'src/vite-env.d.ts',
        // keep tests-only and types out of coverage
      ],
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
