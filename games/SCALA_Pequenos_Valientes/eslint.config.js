import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import css from '@eslint/css';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist/**', 'android/**', 'entregables/**', '.tests/**']),
  { ...js.configs.recommended, files: ['**/*.{js,mjs,ts}'] },
  { files: ['**/*.{js,mjs,ts}'], languageOptions: { globals: globals.browser } },
  { files: ['scripts/**/*.mjs', 'vite.config.ts'], languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended.map(config => ({ ...config, files: ['**/*.ts'] })),
  { files: ['**/*.{js,mjs,ts}'], rules: { eqeqeq: 'error', 'prefer-const': 'error', 'no-var': 'error', 'no-duplicate-imports': 'error' } },
  { files: ['**/*.css'], plugins: { css }, language: 'css/css', extends: ['css/recommended'], rules: { 'css/use-baseline': 'off', 'css/no-important': 'off', 'css/no-invalid-properties': ['error', { allowUnknownVariables: true }] } },
]);
