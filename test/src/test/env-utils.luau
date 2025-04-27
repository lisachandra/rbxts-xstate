local Promise = require(game.ReplicatedStorage.TS.include.Promise)

local setTimeout = require(game.ReplicatedStorage.TS.node_modules["@rbxts"]["luau-polyfill"].out).setTimeout
local consoleSpies = require(game.TestService["console-spies"]).consoleSpies

local EnvTestUtils = {}
EnvTestUtils = {
	silenceConsole = false,

	clearConsoleMocks = function()
		for _k, spy in consoleSpies do
			spy:mockClear()
		end
	end,

	sleep = function(ms)
		return Promise.new(function(resolve)
			return setTimeout(resolve, ms)
		end)
	end,
}

return EnvTestUtils
