// @ts-check
import process from "node:process";
import tseslint from 'typescript-eslint';
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginRoblox from "isentinel-eslint-plugin-roblox-ts";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      "roblox-ts": eslintPluginRoblox
    },
    ...eslintPluginRoblox.configs.recommended
  },
  {
    rules: {
      'prettier/prettier': ["warn", {
        "printWidth": 80,
        "tabWidth": 2,
        "useTabs": false,
        "semi": true,
        "singleQuote": true,
        "trailingComma": "none",
        "bracketSpacing": true,
        "plugins": ["prettier-plugin-jsdoc"],
        "tsdoc": true
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
      'prefer-const': [
        'error',
        {
          destructuring: 'all'
        }
      ]
    }
  },
  {
    ignores: [
      '{docs,examples,templates}/',
      '**/dist',
      '**/*.test.*',
      'scripts/jest-utils/',
      'pnpm-lock.yaml',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
  }
);
