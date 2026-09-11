import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // Build tooling runs in Node, not the browser.
  {
    files: ['vite.config.js', 'tailwind.config.js', 'postcss.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^[A-Z_]',
          // Polymorphic `as`-props destructure to a capitalised name that is
          // only referenced from JSX, which this config does not parse for
          // variable usage.
          argsIgnorePattern: '^[A-Z_]',
          // `catch (err)` where the handler deliberately swallows the error.
          caughtErrorsIgnorePattern: '^(_|err|error)$',
        },
      ],
      // Files that export a component plus a helper (the UI primitives barrel,
      // the auth context) only lose Fast Refresh in dev; splitting them would
      // fragment the module for no runtime benefit.
      'react-refresh/only-export-components': 'off',
    },
  },
])
