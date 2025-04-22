/* eslint
	@typescript-eslint/no-explicit-any: "off",
	@typescript-eslint/naming-convention: [
		"error",
		{
			selector: "default",
			format: ["camelCase", "PascalCase"],
			leadingUnderscore: "allowSingleOrDouble",
			trailingUnderscore: "allowSingleOrDouble"
		}
	]
-- TestUtils declaration file --
*/
import type { jest } from "@rbxts/jest-globals";

import type RuntimeLib from "include/RuntimeLib";

// HACK: Omit 'this' from object methods to bypass 'Cannot index a method without calling it!'
type MockMethod<T> = (
	this: void,
	object: InferThis<T>,
	...args: Parameters<OmitThisParameter<T>>
) => ReturnType<T>;

type MockedObjectWithMethods<T extends object> = {
	[K in keyof T]: InferThis<T[K]> extends never ? T[K] : MockMethod<T[K]>;
};

type MockInstanceDeep<T extends object, Original extends object> = MockInstance<Original> & {
	[K in keyof T]: T[K] extends object
		? ReturnType<typeof TestUtils.createMockInstance<T[K]>> & T[K]
		: T[K];
};

interface MockInstance<T extends object> {
	/** Reference to the original instance. */
	__instance__: T;

	/**
	 * Whether to use the mocked instance as self in specific methods. False by
	 * default.
	 */
	__mockSelf__: Array<keyof T> | boolean;
}

type MockOnRuntime<T extends object> = MockInstanceDeep<
	jest.MockedObjectDeep<MockedObjectWithMethods<T>>,
	T
> & {
	/**
	 * An optional function to return mocked values.
	 *
	 * @param this - Itself.
	 * @param key - The key.
	 * @param value - The value.
	 * @returns A tuple of a boolean whether it should use the returned mocked
	 *   value or not.
	 */
	__mockValue__: <K extends keyof MockOnRuntime<T>>(
		this: MockOnRuntime<T>,
		key: K,
		value: MockOnRuntime<T>[K],
	) => any;
};

/** Provides utility functions for testing Roblox TypeScript code. */
declare const TestUtils: {
	/**
	 * Creates a mock instance that can be used for testing. It proxies property
	 * access to the original instance and allows mocking methods.
	 *
	 * @param instance - The instance to create a mock for.
	 * @returns A mock instance.
	 */
	createMockInstance: <T extends object>(instance: T) => MockInstance<T> & Writable<Partial<T>>;

	/**
	 * Retrieves a descendant ModuleScript from a given root Instance using a
	 * path of child names.
	 *
	 * @param root - The ancestor Instance to start the search from.
	 * @param parts - An array of child names representing the path to the
	 *   module.
	 * @returns The ModuleScript found at the specified path.
	 */
	getModuleByTree: (root: Instance, parts: Array<string>) => ModuleScript;

	/**
	 * Indicates whether the game is currently running in test mode. True if
	 * RunService:IsRunMode().
	 */
	isTesting: boolean;

	/**
	 * Creates a Jest mock object for a given instance, mocking its methods and
	 * nested objects recursively.
	 *
	 * @param jestModule - The Jest module to be used.
	 * @param mockInstance - A mock instance.
	 * @returns A Jest mocked object with methods replaced by mocks.
	 */
	mockOnRuntime: <T extends object>(
		jestModule: typeof jest,
		mockInstance: MockInstance<T> & Writable<Partial<T>>,
	) => MockOnRuntime<T>;

	/**
	 * Resets the TypeScript runtime and clears the Workspace and
	 * ReplicatedStorage of non-essential Instances.
	 *
	 * @param clean - Whether it should cleanup instances.
	 * @returns The reset TypeScript runtime or nil if it wasn't found.
	 */
	resetTSRuntime: (clean?: boolean) => N<RuntimeLib>;

	sleep: (ms: number) => Promise<undefined>;
	clearConsoleMocks: () => void;
};

export = TestUtils;
