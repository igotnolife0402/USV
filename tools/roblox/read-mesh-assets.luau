-- Umbrio Sandbox -> Roblox step 3 (domains/roblox/delivery.md): read the mesh ids of an uploaded "-meshes.fbx" Model asset
-- without inserting it, undo the importer's axis turn and unit scale (UMBCAL0/X/Y/Z cubes, 64 studs apart in the file) and
-- return JSON {UMB00001: {id, size, rot}} for roblox.rbxmx {meshAssets}. Set ASSET before running (execute_luau, Edit).
local ASSET = _G.UMB_ASSET or error("set _G.UMB_ASSET = <model asset id>")
local L = 64
local root = game:GetObjects("rbxassetid://" .. tostring(ASSET))[1]
local function tagOf(inst, pat)
	while inst and inst ~= root.Parent do
		local k = string.match(inst.Name, pat) if k then return k end
		inst = inst.Parent
	end
end
local cal, meshes = {}, {}
for _, d in root:GetDescendants() do
	if d:IsA("BasePart") then
		local c = tagOf(d, "^UMBCAL([0XYZ])")
		if c then cal[c] = cal[c] or d
		elseif d:IsA("MeshPart") then local k = tagOf(d, "^(UMB%d%d%d%d%d)") if k and not meshes[k] then meshes[k] = d end end
	end
end
assert(cal["0"] and cal.X and cal.Y and cal.Z, "calibration cubes missing")
local p0 = cal["0"].Position
local cx, cy, cz = (cal.X.Position - p0) / L, (cal.Y.Position - p0) / L, (cal.Z.Position - p0) / L
local s = (cx.Magnitude + cy.Magnitude + cz.Magnitude) / 3
local function snap(v) v = v.Unit for _, a in { Vector3.xAxis, Vector3.yAxis, Vector3.zAxis } do if math.abs(v:Dot(a)) > 0.99 then return a * math.sign(v:Dot(a)) end end return v end
local Q = CFrame.fromMatrix(Vector3.zero, snap(cx), snap(cy), snap(cz))
local out, n = {}, 0
local function r4(x) return math.floor(x * 10000 + 0.5) / 10000 end
for k, m in meshes do
	local R = Q:Inverse() * m.CFrame.Rotation
	local _, _, _, a, b, c, d, e, f, g, h, i = R:GetComponents()
	out[k] = { id = m.MeshId, size = { r4(m.Size.X / s), r4(m.Size.Y / s), r4(m.Size.Z / s) },
		rot = { math.round(a), math.round(b), math.round(c), math.round(d), math.round(e), math.round(f), math.round(g), math.round(h), math.round(i) },
		tex = m.TextureID ~= "" and m.TextureID or nil }
	n += 1
end
root:Destroy()
return game:GetService("HttpService"):JSONEncode({ count = n, scale = s, assets = out })
