local _0 = require(script.Parent["console-spies"])
local consoleSpies, spyOnConsole = _0.consoleSpies, _0.spyOnConsole;
local envTestUtils = require(script.Parent["env-utils"])

local jestGlobals = require(game.ReplicatedStorage.TS.node_modules["@rbxts"]["jest-globals"].src);
local expect, afterEach, jest = jestGlobals.expect, jestGlobals.afterEach, jestGlobals.jest

expect.extend({
	toMatchMockCallsSnapshot = function(self, received, ...)
		if jest.isMockFunction(received) then
			error(
				"`toMatchMockCallsSnapshot` can only be used on mocked functions"
			);
		end

		local calls = received.mock.calls;
		received:mockClear();
		return expect.toMatchSnapshot(self, calls, ...);
	end,
});

local console = {
	-- error = jest.globalEnv.error,
	print = jest.globalEnv.print,
	warn = jest.globalEnv.warn,
}

afterEach(function()
	for method in consoleSpies do
		local spy = consoleSpies[method]

		if #spy.mock.calls > 0 then
			local calls = spy.mock.calls;
			spy:mockRestore();

			if not envTestUtils.silenceConsole then
				for _, args in calls do
					-- actually log the "unobserved" calls to the console to make them observable in the test output
					console[method](unpack(args))
				end
			end

			-- as we just restored the mock, we need to setup a new spy
			consoleSpies[method] = spyOnConsole(method);

			--[[
			error(
				table.concat({
					`console.${method} was called unexpectedly ${calls.length} times without observing its calls with \`expect(console.${method}).toMatchMockCallsInlineSnapshot()\`.`,
					`You can check the observed calls above.`,
				}, " ")
			);
			]]
		end
	end
end)
