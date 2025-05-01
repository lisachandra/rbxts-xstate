import { STATE_IDENTIFIER } from "constants";
import { indexString } from "utils/polyfill/indexString";

export const isStateId = (str: any) => indexString(str as string, 0 + 1) === STATE_IDENTIFIER;
