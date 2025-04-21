// @ts-check
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginRoblox from "isentinel-eslint-plugin-roblox-ts";
import prettierConfig from "./prettier.config.mjs";

export default tseslint.config(
	{
		ignores: ["**/out/**", "**/*.spec.*", "pnpm-lock.yaml", "eslint.config.mjs"],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	eslintPluginPrettierRecommended,
	{
		plugins: {
			"roblox-ts": eslintPluginRoblox,
		},
		rules: {
			...eslintPluginRoblox.configs.recommended.rules,
			"roblox-ts/lua-truthiness": "off",
			"roblox-ts/no-null": "off",
		},
	},
	{
		rules: {
			"prettier/prettier": [
				"warn",
				prettierConfig,
			],
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
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-redundant-type-constituents": "off",
			"@typescript-eslint/only-throw-error": "off",
			"@typescript-eslint/prefer-promise-reject-errors": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"prefer-const": [
				"error",
				{
					destructuring: "all",
				},
			],
		},
	},
	{
		files: ["packages/event-target/**"],
		rules: {
			"@typescript-eslint/no-unsafe-enum-comparison": "off",
		},
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: "error",
		},
	},
);
