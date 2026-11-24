--!strict
-- Wyvern pet showcase: a 50-stud wyvern loops around the floating local player (16 s seamless loop).
-- Client-only visual. Needs ReplicatedStorage.Wyvern = the imported Wyvern.glb model (MeshParts named after parts).
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Bake = require(script.Bake)
local Spine = require(script.Spine)
local PlayerPose = require(script.PlayerPose)
local Fx = require(script.Fx)
local Camera = require(script.Camera)

local CONFIG = {
	SCALE = 1, -- whole loop + wyvern size
	FX_ON = true,
	MODEL_NAME = "Wyvern",
	CAMERA = true, -- cinematic showcase camera (orbit + flare payoff); false = the player keeps their own camera
	POST = true, -- bloom, colour grade, depth of field + payoff flash while the camera runs
}

local player = Players.LocalPlayer

local function prepareModel(): (Model?, { [string]: BasePart }, { BasePart }, { [string]: Vector3 })
	local source = ReplicatedStorage:WaitForChild(CONFIG.MODEL_NAME, 15)
	if not source or not source:IsA("Model") then
		warn("[WyvernPet] put the imported Wyvern.glb model in ReplicatedStorage as 'Wyvern' (see tools/roblox/wyvern/README.md)")
		return nil, {}, {}, {}
	end
	local model = source:Clone()
	local parts: { [string]: BasePart } = {}
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			parts[d.Name] = d
		end
	end
	local list: { BasePart } = {}
	local centers: { [string]: Vector3 } = {}
	local missing = {}
	for _, info in Bake.PARTS do
		local p = parts[info.name]
		if not p then
			table.insert(missing, info.name)
			continue
		end
		p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch = true, false, false, false
		p.Size = info.size * CONFIG.SCALE -- fixes importer unit scaling
		if info.mat == "membrane" then
			p.Transparency = 0.12
			p.CastShadow = false
		elseif info.mat == "eye" then
			p.Material = Enum.Material.Neon
			p.Color = Color3.fromHex("7ff6ff")
			if p:IsA("MeshPart") then
				p.TextureID = ""
			end
			local sa = p:FindFirstChildOfClass("SurfaceAppearance")
			if sa then
				sa:Destroy()
			end
		end
		centers[info.name] = info.center * CONFIG.SCALE
		table.insert(list, p)
	end
	if #missing > 0 then
		warn("[WyvernPet] model is missing parts: " .. table.concat(missing, ", "))
	end
	model.Parent = workspace
	return model, parts, list, centers
end

local function run(character: Model)
	local model, parts, list, centers = prepareModel()
	if not model then
		return
	end
	local center = PlayerPose.start(character)
	if not center then
		model:Destroy()
		return
	end
	local scale = CONFIG.SCALE
	local fx = if CONFIG.FX_ON then Fx.new(model, parts, centers) else nil
	local info: { [string]: { anchor: string } } = {}
	for _, p in Bake.PARTS do
		info[p.name] = p
	end
	local cframes: { CFrame } = table.create(#list)
	local t0 = os.clock()
	local cam = if CONFIG.CAMERA then Camera.start(CONFIG.POST) else nil
	local lastT = 0

	local conn = RunService.RenderStepped:Connect(function()
		local now = os.clock() - t0
		local c = now % Bake.LOOP_LEN
		local t = Camera.warp(c) -- story time: slow-mo into the flare, 4-frame hit-stop, loop still 16 s
		local payoff = lastT < Bake.CAM.PAYOFF_STORY and t >= Bake.CAM.PAYOFF_STORY
		lastT = t
		local pose = Spine.pose(t)
		local sub = Spine.subParts(pose)
		-- anchor frames to world (path space is scaled about the centre)
		local world: { [string]: CFrame } = {}
		for name, f in pose.frames do
			world[name] = center * CFrame.new(f.Position * scale) * f.Rotation
		end
		for i, p in list do
			local name = p.Name
			local a = world[info[name].anchor]
			local s = sub[name]
			local local_ = if s then s else CFrame.identity
			if scale ~= 1 then
				local_ = CFrame.new(local_.Position * scale) * local_.Rotation
			end
			cframes[i] = a * local_ * CFrame.new(centers[name])
		end
		workspace:BulkMoveTo(list, cframes, Enum.BulkMoveMode.FireCFrameChanged)
		PlayerPose.update(character, center, t)
		if fx then
			local root = character:FindFirstChild("HumanoidRootPart") :: BasePart?
			fx:update(pose, world, now, if root then root.Position else center.Position, payoff)
		end
		if cam then
			Camera.update(cam, c, center, scale, world.TorsoSeg2.Position)
		end
	end)

	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local cleaned = false
	local function cleanup()
		if cleaned then
			return
		end
		cleaned = true
		conn:Disconnect()
		if cam then
			Camera.stop(cam)
		end
		if fx then
			fx:destroy()
		end
		model:Destroy()
		PlayerPose.stop(character)
	end
	character.AncestryChanged:Connect(function(_, parent)
		if not parent then
			cleanup()
		end
	end)
	if humanoid then
		humanoid.Died:Connect(cleanup)
	end
end

player.CharacterAdded:Connect(function(character)
	character:WaitForChild("HumanoidRootPart", 10)
	task.wait(0.5) -- let Animate start so its tracks can be stopped
	run(character)
end)
local existing = player.Character
if existing then
	task.spawn(run, existing)
end
