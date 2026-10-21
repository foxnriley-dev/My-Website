import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.expo/**', 'apps/mobile/ios/**', 'apps/mobile/android/**', '**/*.d.ts', 'apps/web/test-results/**', 'apps/web/playwright-report/**', 'supabase/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', '**/*.config.{js,mjs}', 'apps/mobile/jest.setup.js', 'apps/mobile/metro.config.js'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', require: 'readonly', module: 'writable', __dirname: 'readonly', jest: 'readonly', Buffer: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Native code must never import server-only modules.
    files: ['apps/mobile/**/*.{ts,tsx}', 'packages/api-client/**/*.ts', 'packages/contracts/**/*.ts', 'packages/domain/**/*.ts', 'packages/design-tokens/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@ife/server', '@ife/server/*', 'postgres', 'pg-boss', 'next/*'], message: 'Server-only or web-only module in shared/native code.' }] }],
    },
  },
);
