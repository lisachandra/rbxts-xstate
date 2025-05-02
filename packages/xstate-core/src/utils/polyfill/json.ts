import { HttpService } from "@rbxts/services";

export const JSON = {
	stringify: (t: unknown): string => {
		if (!typeIs(t, "table")) {
			return HttpService.JSONEncode(t);
		}

		const obj =
			"toJSON" in t && typeIs(t.toJSON, "function") ? (t.toJSON() as object) : table.clone(t);
		setmetatable(obj, undefined);

		for (const [k, v] of pairs(obj)) {
			let key = k;
			let value = v;

			if (typeIs(v, "table")) {
				value = JSON.stringify(v);
			}

			if (typeIs(k, "table")) {
				key = JSON.stringify(k);
			}

			if (key !== k || value !== v) {
				// @ts-expect-error
				obj[k] = v;
			}
		}
		return HttpService.JSONEncode(t);
	},

	parse: (str: string): any => {
		return HttpService.JSONDecode(str);
	},
};
