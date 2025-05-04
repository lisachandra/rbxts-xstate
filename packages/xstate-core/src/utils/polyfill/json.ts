import { HttpService } from "@rbxts/services";

export class JSON {
	static stringify(this: void, t: unknown, stringify: false): unknown;
	static stringify(this: void, t: unknown, stringify?: true): string;
	static stringify(this: void, t: unknown, stringify = true): unknown {
		if (!typeIs(t, "table")) {
			return stringify ? HttpService.JSONEncode(t) : t;
		}

		const obj =
			"toJSON" in t && typeIs(t.toJSON, "function")
				? (t.toJSON(t) as object)
				: table.clone(t);

		for (const [k, v] of pairs(obj)) {
			let key = k;
			let value = v;

			if (typeIs(v, "table")) {
				value = JSON.stringify(v, false) as defined;
			}

			if (typeIs(k, "table")) {
				key = JSON.stringify(k, false) as defined;
			}

			// @ts-expect-error
			obj[key] = value;
		}

		return stringify ? HttpService.JSONEncode(obj) : obj;
	}

	static parse(this: void, str: string): any {
		return HttpService.JSONDecode(str);
	}
}
