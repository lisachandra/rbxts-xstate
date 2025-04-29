import type { SingleOrArray, AnyTransitionConfig, TransitionConfigTarget } from "types";
import { toArrayStrict } from "../polyfill/array";

export function toTransitionConfigArray(
	configLike: SingleOrArray<AnyTransitionConfig | TransitionConfigTarget>,
): Array<AnyTransitionConfig> {
	return toArrayStrict(configLike as defined).map(transitionLike => {
		if (transitionLike === undefined || typeIs(transitionLike, "string")) {
			return { target: transitionLike };
		}

		return transitionLike;
	});
}
