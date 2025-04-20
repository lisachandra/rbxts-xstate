// @ts-check
import process from 'node:process';
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginRoblox from 'isentinel-eslint-plugin-roblox-ts';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      'roblox-ts': eslintPluginRoblox
    },
    rules: {
      ...eslintPluginRoblox.configs.recommended.rules,
      'roblox-ts/lua-truthiness': 'off',
      'roblox-ts/no-null': 'off',
    }
  },
  {
    rules: {
      'prettier/prettier': ['warn', {
        'printWidth': 80,
        'tabWidth': 2,
        'useTabs': false,
        'semi': true,
        'singleQuote': true,
        'trailingComma': 'none',
        'bracketSpacing': true,
        'plugins': ['prettier-plugin-jsdoc'],
        'tsdoc': true
      }],
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'with-single-extends',
          allowObjectTypes: 'always'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'prefer-const': [
        'error',
        {
          destructuring: 'all'
        }
      ]
    }
  },
  {
    files: ["packages/event-target/**"],
    rules: {
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
    },
  },
  {
    ignores: [
      '{docs,examples,templates}/',
      '**/out',
      '**/dist',
      '**/*.test.*',
      'scripts/jest-utils/',
      'pnpm-lock.yaml',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
  }
);
