import * as prettyFormat from "@rbxts/pretty-format";

export interface PrettyDOMOptions extends prettyFormat.OptionsReceived {
	/**
	 * Given a `Instance` return `false` if you wish to ignore that node in the
	 * output. By default, ignores `<style />`, `<script />` and comment nodes.
	 */
	filterNode?: (node: Instance) => boolean;
}

export function prettyDOM(
	dom?: Element,
	maxLength?: number,
	options?: PrettyDOMOptions,
): string | false;
export function logDOM(dom?: Element, maxLength?: number, options?: PrettyDOMOptions): void;
export { prettyFormat };
