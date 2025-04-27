import "@rbxts/jest-globals";

declare global {
	export namespace jest {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		interface Matchers<R, T = any> {
			toMatchMockCallsSnapshot(snapshot?: object): R;
		}
	}
}
