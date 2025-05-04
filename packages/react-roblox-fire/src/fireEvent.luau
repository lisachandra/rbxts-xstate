local state = require(script.Parent.state)

local function fireEvent(instance: Instance, eventName: string, ...)
	local success, isSignal = pcall(function()
		return typeof((instance :: any)[eventName]) == "RBXScriptSignal"
	end)

	if not success then
		error(`{instance.ClassName} does not have any member named {eventName}`)
	end

	if not isSignal then
		error(`{instance.ClassName} has as member {eventName}, but it is not an event`)
	end

	local listeners = state.listeners[instance]
	if listeners == nil then
		return
	end

	local callback = listeners[eventName]
	if callback == nil then
		return
	end

	callback(instance, ...)
end

return fireEvent
