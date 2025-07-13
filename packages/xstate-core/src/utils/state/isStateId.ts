import { STATE_IDENTIFIER } from "constants";
import { indexString } from "utils/polyfill/indexString";

export const isStateId = (str: any) => {
	return indexString(str, 0) === STATE_IDENTIFIER;
};
