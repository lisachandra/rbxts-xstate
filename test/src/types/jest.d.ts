/* eslint-disable roblox-ts/no-namespace-merging -- allowed */
declare global {
	export module "@rbxts/jest-globals" {
		export declare namespace jest {
			declare const globalEnv: {
				warn: typeof print;
				print: typeof warn;
				math: typeof math;
			};

			interface Matchers<R, T = any> {
				toMatchMockCallsSnapshot(snapshot?: object): R;
			}
		}
	}
}
