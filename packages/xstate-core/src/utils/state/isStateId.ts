import { STATE_IDENTIFIER } from "constants";
import { indexString } from "utils/polyfill/indexString";

export const isStateId = (str: any) => {
	return typeIs(str, "string") && str.size() && indexString(str, 0 + 1) === STATE_IDENTIFIER;
};
