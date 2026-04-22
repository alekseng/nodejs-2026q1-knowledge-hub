import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.unit.spec.ts', 'src/__tests__/unit/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.interface.ts',
        'src/**/*.decorator.ts',
        'src/**/*.controller.ts',
        'src/**/*.spec.ts',
        'src/app.service.ts',
        'src/common/**',
        'src/prisma/**',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});
