import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig([
    {
        ignores: ['.eslintrc.cjs', 'vite.config.ts', 'scripts/watch-lint.js', 'dist/**', 'node_modules/**'],
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
            },
        },
        settings: {
            'import/resolver': {
                typescript: true,
                node: {
                    paths: ['src'],
                    extensions: ['.js', '.jsx', '.ts', '.tsx'],
                },
            },
            react: {
                version: 'detect',
            },
        },
        plugins: {
            import: importPlugin,
        },
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        rules: {
            indent: [
                'error',
                4,
                {
                    ignoredNodes: ['TemplateLiteral'],
                    SwitchCase: 1,
                },
            ],
            'max-len': [
                'warn',
                {
                    code: 200,
                },
            ],
            'import/no-cycle': 'warn',
            'no-console': 'off',
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/consistent-type-assertions': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-expressions': 'off',
        },
    },
    {
        files: ['**/*.{jsx,tsx}'],
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooks,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',
        },
    },
    eslintConfigPrettier,
]);
