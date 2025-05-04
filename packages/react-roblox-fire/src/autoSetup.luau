local setup = require(script.Parent.setup)

local function autoSetup()
	setup(script.Parent.Parent:WaitForChild("ReactLua")["node_modules"]["@jsdotlua"]["react-roblox"])
	--[[
	local packages = script:FindFirstAncestor("Packages") or script:FindFirstAncestor("DevPackages")
	if packages == nil then
		return
	end

	for _, packageInIndex in packages._Index:GetChildren() do
		local plain = true
		if not string.find(packageInIndex.Name, "_react-roblox@", nil, plain) then
			continue
		end

		local reactRobloxScript = packageInIndex["react-roblox"]
		setup(reactRobloxScript)
	end
	]]
end

return autoSetup
