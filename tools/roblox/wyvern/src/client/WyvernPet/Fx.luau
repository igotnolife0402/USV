--!strict
-- Wind + motion VFX riding the wyvern: wingtip and tail trails, dash-only wind spirals and speed lines,
-- a cloud puff at each dash start, one shockwave ring on the payoff frame at the flare (the single big effect), faint ambient wind.
-- Built-in textures only (rbxasset://), so nothing needs uploading.
local Bake = require(script.Parent.Bake)

local Fx = {}
Fx.__index = Fx

local WIND = Color3.fromHex("dff8ff")
local SPARK = "rbxasset://textures/particles/sparkles_main.dds"
local SMOKE = "rbxasset://textures/particles/smoke_main.dds"
local RING_SEGS = 32
local RING_TIME = 0.8
local TRAIL_CULL = 200

export type Fx = typeof(setmetatable({} :: {
	model: Model,
	trails: { Trail },
	spiral: { { a: Attachment, b: Attachment, trail: Trail } },
	speed: ParticleEmitter,
	puff: ParticleEmitter,
	ambient: ParticleEmitter,
	ring: { BasePart },
	ringBorn: number,
	lastDash: number,
	lastFlare: number,
	cullAt: number,
	centers: { [string]: Vector3 },
}, Fx))

local function attach(part: BasePart, pos: Vector3, name: string): Attachment
	local a = Instance.new("Attachment")
	a.Name = name
	a.Position = pos
	a.Parent = part
	return a
end

local function trail(part: BasePart, a: Attachment, b: Attachment, life: number): Trail
	local t = Instance.new("Trail")
	t.Attachment0 = a
	t.Attachment1 = b
	t.Lifetime = life
	t.Color = ColorSequence.new(WIND)
	t.Transparency = NumberSequence.new(0.3, 1)
	t.WidthScale = NumberSequence.new(1, 0)
	t.LightEmission = 1
	t.LightInfluence = 0
	t.FaceCamera = true
	t.MinLength = 0.05
	t.Parent = part
	return t
end

local function emitter(part: BasePart, props: { [string]: any }): ParticleEmitter
	local e = Instance.new("ParticleEmitter")
	for k, v in props do
		(e :: any)[k] = v
	end
	e.Parent = part
	return e
end

-- parts: name -> MeshPart; centers: name -> mesh centre in its anchor frame (from Bake.PARTS)
function Fx.new(model: Model, parts: { [string]: BasePart }, centers: { [string]: Vector3 }): Fx
	local self = setmetatable({
		model = model, trails = {}, spiral = {}, ring = {}, ringBorn = -1, lastDash = 0, lastFlare = 0, cullAt = 0, centers = centers,
	} :: any, Fx) :: Fx

	-- wingtips: ribbon 0.4 wide from the tip toward the wrist
	for side, w in Bake.WING_TIP do
		local part = parts["Wing" .. side .. "Outer"]
		local c = centers["Wing" .. side .. "Outer"]
		local dir = (w.wrist - w.tip).Unit
		local a = attach(part, w.tip - c, "TipA")
		local b = attach(part, w.tip + dir * 0.4 - c, "TipB")
		table.insert(self.trails, trail(part, a, b, 0.6))
	end
	-- tail tip, 1.2 wide
	do
		local part, c = parts.TailBlade, centers.TailBlade
		local tip = Vector3.new(0, 0, 3.4)
		local t = trail(part, attach(part, tip + Vector3.new(0.6, 0, 0) - c, "TailA"), attach(part, tip - Vector3.new(0.6, 0, 0) - c, "TailB"), 0.9)
		table.insert(self.trails, t)
	end
	-- wind spirals: attachments orbit TorsoSeg3 (moved in update), trails on only while dashing
	for i = 1, 2 do
		local part = parts.TorsoSeg3
		local a, b = attach(part, Vector3.zero, "SpiralA" .. i), attach(part, Vector3.zero, "SpiralB" .. i)
		local tr = trail(part, a, b, 0.5)
		tr.Enabled = false
		table.insert(self.spiral, { a = a, b = b, trail = tr })
	end
	self.speed = emitter(parts.Head, {
		Texture = SPARK, Color = ColorSequence.new(WIND), LightEmission = 1, LightInfluence = 0,
		Size = NumberSequence.new(0.18), Squash = NumberSequence.new(2.5), Orientation = Enum.ParticleOrientation.VelocityParallel,
		Transparency = NumberSequence.new(0.2, 1), Lifetime = NumberRange.new(0.3, 0.4), Speed = NumberRange.new(30, 40),
		EmissionDirection = Enum.NormalId.Back, SpreadAngle = Vector2.new(25, 25), Rate = 0, LockedToPart = false,
	})
	self.puff = emitter(parts.TorsoSeg2, {
		Texture = SMOKE, Color = ColorSequence.new(Color3.fromHex("eef9ff")), LightInfluence = 0.3,
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 2), NumberSequenceKeypoint.new(1, 7) }),
		Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.55), NumberSequenceKeypoint.new(1, 1) }),
		Lifetime = NumberRange.new(0.8, 1), Speed = NumberRange.new(4, 9), SpreadAngle = Vector2.new(180, 180),
		Drag = 3, Rate = 0, LockedToPart = false,
	})
	self.ambient = emitter(parts.TorsoSeg1, {
		Texture = SPARK, Color = ColorSequence.new(WIND), LightEmission = 1, LightInfluence = 0,
		Size = NumberSequence.new(0.1), Squash = NumberSequence.new(2), Orientation = Enum.ParticleOrientation.VelocityParallel,
		Transparency = NumberSequence.new(0.6, 1), Lifetime = NumberRange.new(1.2, 1.6), Speed = NumberRange.new(3, 6),
		SpreadAngle = Vector2.new(180, 180), Rate = 6, LockedToPart = false,
	})
	-- shockwave ring: 32 thin neon chords, hidden until the flare
	for i = 1, RING_SEGS do
		local p = Instance.new("Part")
		p.Name = "Shock" .. i
		p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow = true, false, false, false, false
		p.Material = Enum.Material.Neon
		p.Color = WIND
		p.Transparency = 1
		p.Size = Vector3.new(0.3, 0.3, 1)
		p.Parent = model
		table.insert(self.ring, p)
	end
	return self
end

-- pose: Spine pose; frames: world CFrames of anchors; now: clock seconds
function Fx.update(self: Fx, pose: any, frames: { [string]: CFrame }, now: number, playerPos: Vector3, payoff: boolean)
	-- spirals: two points 180 deg apart orbiting the torso 3 times a second
	local seg3 = frames.TorsoSeg3
	local c3 = self.centers.TorsoSeg3
	local ang = now * math.pi * 2 * 3
	for i, s in self.spiral do
		local o = ang + (i - 1) * math.pi
		s.a.Position = Vector3.new(math.cos(o) * 3.6, math.sin(o) * 3.6, 1) - c3
		s.b.Position = Vector3.new(math.cos(o) * 3.1, math.sin(o) * 3.1, 1) - c3
		s.trail.Enabled = pose.dash > 0.3
	end
	self.speed.Rate = 60 * math.clamp(pose.dash, 0, 1)
	if self.lastDash < 0.5 and pose.dash >= 0.5 then
		self.puff:Emit(12)
	end
	if payoff then -- the camera's hit-stop + flash frame (Bake.CAM.PAYOFF_STORY), so ring, flash and shake land together
		self.ringBorn = now
	end
	self.lastDash, self.lastFlare = pose.dash, pose.flare

	-- ring: expands 2 -> 30 studs, eased out, faces the player
	local a = (now - self.ringBorn) / RING_TIME
	if self.ringBorn >= 0 and a >= 0 and a < 1 then
		local chest = frames.TorsoSeg1.Position
		local face = CFrame.lookAt(chest, playerPos)
		local r = 2 + 28 * (1 - (1 - a) ^ 3)
		local chord = 2 * r * math.sin(math.pi / RING_SEGS) + 0.2
		for i, p in self.ring do
			local th = (i - 0.5) / RING_SEGS * math.pi * 2
			p.Size = Vector3.new(0.35, 0.35, chord)
			p.CFrame = face * CFrame.Angles(0, 0, th) * CFrame.new(0, r, 0) * CFrame.Angles(0, math.pi / 2, 0)
			p.Transparency = 0.2 + 0.8 * a
		end
	elseif self.ringBorn >= 0 then
		for _, p in self.ring do
			p.Transparency = 1
		end
		self.ringBorn = -1
	end

	-- cull trails when the camera is far
	if now >= self.cullAt then
		self.cullAt = now + 0.5
		local cam = workspace.CurrentCamera
		local near = cam ~= nil and (cam.CFrame.Position - frames.Head.Position).Magnitude <= TRAIL_CULL
		for _, t in self.trails do
			t.Enabled = near
		end
	end
end

function Fx.destroy(self: Fx)
	for _, p in self.ring do
		p:Destroy()
	end
	self.ring = {}
end

return Fx
