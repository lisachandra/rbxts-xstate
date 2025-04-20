--!nocheck

local TestUtils = {}
TestUtils = {
	isTesting = _G.__TEST__, -- Set within spec.server.luau

	getModuleByTree = function(root, parts)
		local current = root

		for _, nextPart in parts do
			current = current:WaitForChild(nextPart)
		end

		return current
	end,

	resetTSRuntime = function(clean)
		local tsRuntime

		for key, runtime in _G do
			if typeof(key) == "Instance" and key:IsA("ModuleScript") then
				if not tsRuntime and type(runtime) == "table" and type(runtime.reset) == "function" then
					tsRuntime = runtime
				end

				_G[key] = nil
			end
		end

		if tsRuntime ~= nil then
			tsRuntime.reset()
		end

		if clean then
			-- Delete unrelated instances / side effects for testing.
			-- Tests should never be dependent on external instances.
			for _, instance in game:GetService("Workspace"):GetChildren() do
				if not (instance:IsA("Terrain") or instance:IsA("Camera")) then
					instance:Destroy()
				end
			end

			--[[
			-- Replicated storage assets should be synced
			for _, instance in game:GetService("ReplicatedStorage"):GetChildren() do
				if not (instance.Name == "TS" or instance.Name == "rbxts_include") then
					instance:Destroy()
				end
			end
			]]
		end

		return tsRuntime
	end,

	mockOnRuntime = function(jest, mockInstance)
		local mockInstanceIndex = getmetatable(mockInstance).__index
		mockInstance.__mockValue__ = function() end

		return setmetatable(mockInstance, {
			__index = function(self, key)
				local value = mockInstanceIndex(self, key)
				local useMocked, mockedValue = rawget(self, "__mockValue__")(self, key, value)

				if useMocked ~= true then
					mockedValue = if value ~= nil
						then if type(value) == "function"
							then jest.fn(value).mockName(tostring(key))
							elseif
								(type(value) == "table" and rawget(value, "__instance__") == nil)
								or type(value) == "userdata"
							then TestUtils.mockOnRuntime(jest, TestUtils.createMockInstance(value))
							else value
						else nil
				end

				self[key] = mockedValue

				return mockedValue
			end,
		})
	end,

	createMockInstance = function(instance)
		return setmetatable({
			__instance__ = instance,
			__mockSelf__ = {},
		}, {
			__index = function(self, key)
				local instance = rawget(self, "__instance__")
				local exists, value = pcall(function()
					return instance[key]
				end)

				local mockSelf = rawget(self, "__mockSelf__")
				local shouldMockSelf = (type(mockSelf) == "table" and mockSelf[key] ~= true)
					or (type(mockSelf) ~= "table" and mockSelf ~= true)

				return if exists
					then if type(value) == "function" and shouldMockSelf
						then function(_, ...)
							return value(instance, ...)
						end
						else value
					else nil
			end,
		})
	end,
}

return TestUtils
