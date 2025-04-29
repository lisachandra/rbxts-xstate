import { isMachineSnapshot } from "utils/state/isMachineSnapshot";
import type { StateLike, StateValue } from "types";
import { pathToStateValue } from "./pathToStateValue";
import { toStatePath } from "./toStatePath";

export function toStateValue(stateValue: StateLike<any> | StateValue): StateValue {
	if (isMachineSnapshot(stateValue)) {
		return stateValue.value;
	}

	if (typeIs(stateValue, "string")) {
		return stateValue as StateValue;
	}

	const statePath = toStatePath(stateValue as never);
	return pathToStateValue(statePath);
}
