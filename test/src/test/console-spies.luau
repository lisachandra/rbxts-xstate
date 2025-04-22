local jest = require(game.ReplicatedStorage.TS.node_modules["@rbxts"].jest.src)

local function spyOnConsole(method)
	return jest.spyOn(jest.globalEnv, method).mockImplementation(function()
		return nil
	end)
end

return {
	spyOnConsole = spyOnConsole,
	consoleSpies = {
		error = spyOnConsole("error"),
		print = spyOnConsole("print"),
		warn = spyOnConsole("warn"),
	},
}
