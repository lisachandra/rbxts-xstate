/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
	arrowParens: "avoid",
	jsdocPreferCodeFences: true,
	jsdocPrintWidth: 80,
	plugins: ["prettier-plugin-jsdoc"],
	printWidth: 100,
	quoteProps: "consistent",
	semi: true,
	singleQuote: false,
	tabWidth: 4,
	trailingComma: "all",
	tsdoc: true,
	useTabs: true,

};

export default config;
