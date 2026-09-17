import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

const githubPagesBase = '/testing-platform/';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: process.env.PUBLIC_PATH || (process.env.GITHUB_ACTIONS ? githubPagesBase : '/'),
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    css: {
        modules: {
            localsConvention: 'camelCase',
        },
    },
    envDir: path.resolve(__dirname, 'env'),

    server: {
        allowedHosts: ['cyberrange-dev.intern-ai.org.cn', 'mineru.net'],
        port: 8080,
        proxy: {
            '/v1': {
                target: 'http://cyberrange-dev.intern-ai.org.cn',
                changeOrigin: true,
            },
            '/api/v1': {
                target: 'http://cyberrange-dev.intern-ai.org.cn',
                changeOrigin: true,
            },
        },
    },
});
