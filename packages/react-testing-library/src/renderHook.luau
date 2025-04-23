-- Compiled with roblox-ts v3.0.0
-- eslint-disable @typescript-eslint/no-require-imports
local React = require(script.Parent:WaitForChild('node_modules'):WaitForChild('.luau-aliases'):WaitForChild('@jsdotlua'):WaitForChild('react'))
local _binding = require(script.Parent:WaitForChild('node_modules'):WaitForChild('.luau-aliases'):WaitForChild('@jsdotlua'):WaitForChild('react-roblox'))
local act = _binding.act
local createLegacyRoot = _binding.createLegacyRoot
--[[
	*
	 * Allows you to render a hook within a test React component without having to
	 * create that component yourself.
	 *
	 * @see https://github.com/testing-library/react-testing-library

]]
local function renderHook(render, options)
	if options == nil then
		options = {}
	end
	local result = {
		current = nil,
	}
	local function TestComponent(_param)
		local initialProps = _param.initialProps
		local previousProps = React.useRef(initialProps)
		local _fn = render
		local _condition = initialProps
		if _condition == nil then
			_condition = previousProps.current
			if _condition == nil then
				_condition = ({})
			end
		end
		local pendingResult = _fn(_condition)
		previousProps.current = initialProps
		result.current = pendingResult
		return nil
	end
	local root = createLegacyRoot(options.container or Instance.new("Folder"))
	act(function()
		root:render(React.createElement(TestComponent, {
			initialProps = options.initialProps,
		}))
	end)
	local rerender = function(props)
		act(function()
			root:render(React.createElement(TestComponent, {
				initialProps = props,
			}))
		end)
	end
	local unmount = function()
		act(function()
			return root:unmount()
		end)
	end
	return {
		rerender = rerender,
		result = result,
		unmount = unmount,
	}
end
return {
	renderHook = renderHook,
}
