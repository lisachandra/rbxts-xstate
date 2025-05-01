import "@rbxts/jest-globals";

declare global {
	export namespace jest {
		interface Matchers<R, T = any> {
			toMatchMockCallsSnapshot(snapshot?: object): R;
		}
	}
}
