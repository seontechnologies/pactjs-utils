import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import path from 'node:path'
import noOnlyTests from 'eslint-plugin-no-only-tests'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

// eslint-plugin-filenames is unmaintained and breaks on ESLint 10, so the same
// file name check lives here.
const FILENAME_REGEX = /^[a-z0-9-._[\]]+$/
const filenamesPlugin = {
  rules: {
    'match-regex': {
      meta: { type: 'problem', schema: [] },
      create: (context) => ({
        Program: (node) => {
          const name = path.basename(context.filename)
          if (!FILENAME_REGEX.test(name)) {
            context.report({
              node,
              message: `Filename '${name}' does not match ${FILENAME_REGEX}.`
            })
          }
        }
      })
    }
  }
}

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/scripts',
      '**/coverage',
      'vitest.config.ts',
      'eslint.config.mjs',
      'wallaby.js',
      'docs',
      'sample-app/backend/src/generated'
    ]
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  prettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.es2021, ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json']
      }
    },
    plugins: {
      filenames: filenamesPlugin,
      'no-only-tests': noOnlyTests
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true // Always try to resolve types under `@types` directory even if it's not in `package.json`
        }
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-only-tests/no-only-tests': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      'filenames/match-regex': 'error',
      complexity: ['warn', 15],
      'object-curly-spacing': ['error', 'always'],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      semi: ['error', 'never'],
      'import/default': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty-pattern': 'off',
      'import/no-named-as-default': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@playwright/*']
        }
      ]
    }
  }
)
