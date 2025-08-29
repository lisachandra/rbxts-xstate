import { EventObject, Snapshot } from "../index";
import { getShortestPaths } from "./shortestPaths";
import { getSimplePaths } from "./simplePaths";
import { PathGenerator } from "./types";

export const createShortestPathsGen =
	<TSnapshot extends Snapshot<unknown>, TEvent extends EventObject, TInput>(): PathGenerator<
		TSnapshot,
		TEvent,
		TInput
	> =>
	(logic, defaultOptions) => {
		const paths = getShortestPaths(logic, defaultOptions);

		return paths;
	};

export const createSimplePathsGen =
	<TSnapshot extends Snapshot<unknown>, TEvent extends EventObject, TInput>(): PathGenerator<
		TSnapshot,
		TEvent,
		TInput
	> =>
	(logic, defaultOptions) => {
		const paths = getSimplePaths(logic, defaultOptions);

		return paths;
	};
