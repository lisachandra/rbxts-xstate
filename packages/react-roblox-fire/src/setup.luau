local state = require(script.Parent.state)

type SingleEventManager = {
	-- TODO: Check instance type (TextButton Activated and not ProximityPrompt Activated)
	_instance: Instance,

	connect: ConnectEvent,
}

type ConnectEvent = (self: SingleEventManager, key: string, listener: ((Instance, ...any) -> ())?) -> ()

local function createPatchedConnectEvent(original: ConnectEvent): ConnectEvent
	return function(self, key, listener)
		if state.listeners[self._instance] == nil then
			state.listeners[self._instance] = {}

			self._instance.Destroying:Connect(function()
				state.listeners[self._instance] = nil
			end)
		end

		-- Explicit cast because of https://github.com/luau-lang/luau/issues/1081
		state.listeners[self._instance][key] = listener :: (Instance, ...any) -> ()

		if next(state.listeners[self._instance]) == nil then
			state.listeners[self._instance] = nil
		end

		original(self, key, listener)
	end
end

local function setup(reactRobloxModule: ModuleScript)
	local singleEventManagerInstance: Instance = reactRobloxModule

	for _, name in { "client", "roblox", "SingleEventManager" } do
		local found = singleEventManagerInstance:FindFirstChild(name)
		if found == nil then
			error(
				`Could not find {name} when trying to find SingleEventManager, the trick to patch ReactRoblox needs to be updated.`
			)
		end

		singleEventManagerInstance = found
	end

	assert(singleEventManagerInstance:IsA("ModuleScript"), "SingleEventManager is not a ModuleScript")
	local singleEventManager = (require :: any)(singleEventManagerInstance)

	if singleEventManager._virtualInputPatched then
		return
	end

	singleEventManager._virtualInputPatched = true

	assert(singleEventManager.connectEvent ~= nil, "SingleEventManager does not have connectEvent")
	singleEventManager.connectEvent = createPatchedConnectEvent(singleEventManager.connectEvent)
end

return setup
