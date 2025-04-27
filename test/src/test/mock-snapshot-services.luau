local HttpService = game:GetService("HttpService")

local HOST = "http://localhost:9998"

local MockSnapshotServices = {}

MockSnapshotServices.CoreScriptSyncService = {}

function MockSnapshotServices.CoreScriptSyncService:GetScriptFilePath(testScript: ModuleScript): string
	local scriptPath = {}

	local current: Instance? = testScript
	while current ~= game and current ~= nil do
		table.insert(scriptPath, 1, current.Name)
		current = current.Parent
	end

	return HttpService:PostAsync(
		`{HOST}/get-script-file-path`,
		HttpService:JSONEncode({
			scriptPath = scriptPath,
		})
	)
end

MockSnapshotServices.FileSystemService = {}

function MockSnapshotServices.FileSystemService:Exists(path: string): boolean
	error(`NYI: exists {path}`)
end

function MockSnapshotServices.FileSystemService:CreateDirectories(path: string)
	error(`NYI: createDirections {path}`)
end

function MockSnapshotServices.FileSystemService:WriteFile(path: string, contents: string)
	HttpService:PostAsync(
		`{HOST}/write-file`,
		HttpService:JSONEncode({
			filePath = path,
			contents = contents,
		})
	)
end

return MockSnapshotServices
