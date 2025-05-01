import { Error } from "@rbxts/luau-polyfill";

export interface Config {
	testIdAttribute: string;
	/**
	 * WARNING: `unstable` prefix means this API may change in patch and minor
	 * releases.
	 *
	 * @param cb
	 */
	unstable_advanceTimersWrapper(cb: (...args: unknown[]) => unknown): unknown;
	asyncWrapper(cb: (...args: any[]) => any): Promise<any>;
	eventWrapper(cb: (...args: any[]) => any): void;
	asyncUtilTimeout: number;
	computedStyleSupportsPseudoElements: boolean;
	defaultHidden: boolean;
	/** Default value for the `ignore` option in `ByText` queries */
	defaultIgnore: string;
	showOriginalStackTrace: boolean;
	throwSuggestions: boolean;
	getElementError: (message: string | undefined, container: Instance) => Error;
}

export interface ConfigFn {
	(existingConfig: Config): Partial<Config>;
}

export function configure(configDelta: ConfigFn | Partial<Config>): void;
export function getConfig(): Config;
