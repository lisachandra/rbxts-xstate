export function freeze(t: object) {
	const mt = (getmetatable(t) as LuaMetatable<object>) ?? setmetatable(t, {});
	mt.__newindex = () => {
		error("attempt to modify a readonly table");
	};
}
