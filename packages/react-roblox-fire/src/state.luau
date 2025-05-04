-- A globally mutated object
return {
	listeners = {} :: {
		[Instance]: {
			[string]: (Instance, ...any) -> (),
		},
	},
}
