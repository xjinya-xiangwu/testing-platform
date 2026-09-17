import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            include: [
                'src/provider/app-provider.tsx',
                'src/provider/query-client.ts',
                'src/api/dashboard.ts',
                'src/api/api-tokens.ts',
                'src/api/job-detail.ts',
                'src/api/range.ts',
                'src/api/review.ts',
                'src/api/tasks.ts',
                'src/api/training-tasks.ts',
                'src/api/query-keys.ts',
                'src/hooks/useTranslate.tsx',
                'src/stores/simulation-store.ts',
                'src/stores/task-draft-store.ts',
                'src/components/login/login-service.ts',
                'src/components/app-layout/app-layout.tsx',
                'src/hooks/useLogin.tsx',
                'src/pages/dashboard/**/*.{ts,tsx}',
                'src/pages/home/home.tsx',
                'src/pages/range-console/**/*.{ts,tsx}',
                'src/pages/range-detail/**/*.{ts,tsx}',
                'src/pages/range-hall/**/*.{ts,tsx}',
                'src/pages/range/components/**/*.{ts,tsx}',
                'src/pages/range/hooks/**/*.{ts,tsx}',
                'src/pages/review/**/*.{ts,tsx}',
                'src/pages/settings/**/*.{ts,tsx}',
                'src/pages/tasks/**/*.{ts,tsx}',
                'src/pages/training/**/*.{ts,tsx}',
                'src/pages/workbench/**/*.{ts,tsx}',
                'src/routes/auth-loader.ts',
                'src/routes/authenticated-app-layout.tsx',
                'src/stores/workbench-simulation-store.ts',
            ],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
    },
});
