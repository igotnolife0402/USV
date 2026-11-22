--!nocheck
-- Detail-floor metrics for a model in Studio (execute_luau). Read-only: no edits, no camera, no screenshots.
-- Swap MODEL_NAME, run, pipe the returned JSON to: node tools/roblox/detail-check.mjs - [--class prop|hero|scene]
local TARGET = workspace:FindFirstChild("MODEL_NAME")
assert(TARGET, "model not found in workspace")

local parts, meshes, glow, textured, tris, maxMeshTris = 0, 0, 0, 0, 0, 0
local trisReadable, anyMeshPart = true, false
local colors, surfaces, sizes = {}, {}, {}
local sameSizeMax = 0

local function q(c: number): number
	return math.min(15, math.floor(c * 16))
end

for _, d in ipairs(TARGET:GetDescendants()) do
	if d:IsA("BasePart") and d.Transparency < 0.95 then
		parts += 1

		local isMesh = d:IsA("MeshPart") or d:IsA("UnionOperation")
		local texId, hasTex = "", false
		for _, ch in ipairs(d:GetChildren()) do
			if ch:IsA("SpecialMesh") and ch.MeshId ~= "" then
				isMesh = true
				if ch.TextureId ~= "" then
					texId = ch.TextureId
				end
			elseif ch:IsA("SurfaceAppearance") then
				hasTex = true
				if ch.ColorMap ~= "" then
					surfaces["sa:" .. ch.ColorMap] = true
				end
			elseif ch:IsA("Texture") or ch:IsA("Decal") then
				hasTex = true
				if ch.Texture ~= "" then
					surfaces["tex:" .. ch.Texture] = true
				end
			end
		end
		if d:IsA("MeshPart") and d.TextureID ~= "" then
			texId = d.TextureID
		end
		if texId ~= "" then
			hasTex = true
			surfaces["tex:" .. texId] = true
		end
		if isMesh then
			meshes += 1
		end

		local mat = d.Material
		surfaces["mat:" .. mat.Name] = true
		if mat == Enum.Material.Neon then
			glow += 1
		else
			if hasTex or (mat ~= Enum.Material.Plastic and mat ~= Enum.Material.SmoothPlastic) then
				textured += 1
			end
		end

		local c = d.Color
		colors[q(c.R) .. "," .. q(c.G) .. "," .. q(c.B)] = true

		local s = d.Size
		local key = string.format("%.2f,%.2f,%.2f", s.X, s.Y, s.Z)
		sizes[key] = (sizes[key] or 0) + 1
		if sizes[key] > sameSizeMax then
			sameSizeMax = sizes[key]
		end

		if d:IsA("MeshPart") then
			anyMeshPart = true
			local ok, n = pcall(function()
				return d.TriangleCount
			end)
			if ok and type(n) == "number" then
				tris += n
				if n > maxMeshTris then
					maxMeshTris = n
				end
			else
				trisReadable = false
			end
		end
	end
end

local function count(t): number
	local n = 0
	for _ in pairs(t) do
		n += 1
	end
	return n
end

local result = {
	model = TARGET.Name,
	parts = parts,
	meshes = meshes,
	glow = glow,
	textured = textured,
	colors = count(colors),
	surfaces = count(surfaces),
	tris = if trisReadable and anyMeshPart then tris else nil,
	maxMeshTris = if trisReadable and anyMeshPart then maxMeshTris else nil,
	sameSizeMax = sameSizeMax,
}
return game:GetService("HttpService"):JSONEncode(result)
