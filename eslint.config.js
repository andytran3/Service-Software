import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'server/src/generated/**'],
  },
  tseslint.configs.recommended,
  {
    files: ['client/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
);
