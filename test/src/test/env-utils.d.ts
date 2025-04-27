/** Provides utility functions for testing Roblox TypeScript code. */
declare const EnvTestUtils: {
	silenceConsole: boolean;
	sleep: (ms: number) => Promise<undefined>;
	clearConsoleMocks: () => void;
};

export = EnvTestUtils;
