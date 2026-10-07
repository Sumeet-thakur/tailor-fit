import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['**/*.test.ts'],
        globals: true,
        setupFiles: ['./tests/setup.ts'],  // ← your existing setup, keep it
        hookTimeout: 60000,   // MongoMemoryServer downloads binary on first run
        testTimeout: 30000,   // ← was missing entirely (default is only 5000ms)

    },
});