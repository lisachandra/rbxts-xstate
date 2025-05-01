// @ts-check
import tseslint from "typescript-eslint";
import tsparser from "@typescript-eslint/parser"
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginRoblox from "isentinel-eslint-plugin-roblox-ts";
import prettierConfig from "./prettier.config.mjs";
import * as eslintPluginImportX from "eslint-plugin-import-x"

export default tseslint.config(
	{
		ignores: [
			"**/out/**",
			"pnpm-lock.yaml",
			"eslint.config.mjs",
			"prettier.config.mjs",
		],
	},
	{
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: "error",
		},
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	eslintPluginPrettierRecommended,
	eslintPluginImportX.flatConfigs.recommended,
	eslintPluginImportX.flatConfigs.typescript,
	{
		plugins: {
			"roblox-ts": eslintPluginRoblox,
		},
		rules: {
			...eslintPluginRoblox.configs.recommended.rules,
			"roblox-ts/lua-truthiness": "off",
			"roblox-ts/no-null": "off",
			"import-x/no-cycle": "error",
		},
	},
	{
		rules: {
			"prettier/prettier": ["warn", prettierConfig],
			"@typescript-eslint/no-empty-object-type": [
				"error",
				{
					allowInterfaces: "with-single-extends",
					allowObjectTypes: "always",
				},
			],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unused-vars": "off",
			/*
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "all",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],
			*/
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-redundant-type-constituents": "off",
			"@typescript-eslint/only-throw-error": "off",
			"@typescript-eslint/prefer-promise-reject-errors": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/require-await": "off",
			"prefer-const": [
				"error",
				{
					destructuring: "all",
				},
			],
		},
	},
	{
		files: ["test/src/shared/**"],
		rules: {
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
			"no-empty-pattern": "off",
		},
	},
	{
		files: ["packages/event-target/**"],
		rules: {
			"@typescript-eslint/no-unsafe-enum-comparison": "off",
		},
	},
);
