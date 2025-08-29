import { StatePath } from "./types";
import { EventObject, Snapshot } from "../index";
import { simpleStringify } from "./utils";
import { Array } from "@rbxts/luau-polyfill";

/**
 * Deduplicates your paths so that A -> B is not executed separately to A -> B
 * -> C
 */
export const deduplicatePaths = <TSnapshot extends Snapshot<unknown>, TEvent extends EventObject>(
	paths: StatePath<TSnapshot, TEvent>[],
	serializeEvent: (event: TEvent) => string = simpleStringify,
): StatePath<TSnapshot, TEvent>[] => {
	/** Put all paths on the same level so we can dedup them */
	const allPathsWithEventSequence: Array<{
		path: StatePath<TSnapshot, TEvent>;
		eventSequence: string[];
	}> = [];

	paths.forEach(path => {
		allPathsWithEventSequence.push({
			path,
			eventSequence: path.steps.map(step => serializeEvent(step.event)),
		});
	});

	// Sort by path length, descending
	Array.sort(allPathsWithEventSequence, (a, z) => z.path.steps.size() - a.path.steps.size());

	const superpathsWithEventSequence: typeof allPathsWithEventSequence = [];

	/** Filter out the paths that are subpaths of superpaths */
	for (const pathWithEventSequence of allPathsWithEventSequence) {
		let isSubpath = false;

		for (const superpathWithEventSequence of superpathsWithEventSequence) {
			let currentPathIsSubpath = true;

			for (const i of $range(0, pathWithEventSequence.eventSequence.size() - 1)) {
				if (
					pathWithEventSequence.eventSequence[i] !==
					superpathWithEventSequence.eventSequence[i]
				) {
					currentPathIsSubpath = false;
					break;
				}
			}

			if (currentPathIsSubpath) {
				isSubpath = true;
				break;
			}
		}

		if (!isSubpath) {
			superpathsWithEventSequence.push(pathWithEventSequence);
		}
	}

	return superpathsWithEventSequence.map(path => path.path);
};
