--!strict
-- Poses the wyvern at loop time t: follow-the-leader chain on the path, tail sway, wing flap/fold, jaw.
-- Mirrors motion.mjs `pose`, `wingAngles`, `jawAngle` (tests run on the JS copy; keep both in step).
local Bake = require(script.Parent.Bake)
local Path = require(script.Parent.Path)

export type Pose = {
	t: number,
	sHead: number,
	frames: { [string]: CFrame }, -- anchor frames in path space (position = front joint, lookVector = toward the nose)
	dash: number,
	flare: number,
	fold: number,
	spread: number,
	glide: number,
	phase: number,
	move: string,
}

local Spine = {}
local TAU = math.pi * 2
local D = math.pi / 180
local TAIL_START = 15

local function smooth(u: number): number
	return 0.5 - 0.5 * math.cos(math.pi * math.clamp(u, 0, 1))
end

local function sway(dist: number, t: number): number
	local a = smooth((dist - TAIL_START) / (Bake.BODY_LEN - TAIL_START)) * 1.1
	return a * math.sin(TAU * Bake.SWAY_CYCLES * t / Bake.LOOP_LEN - dist * 0.16)
end

local function joint(sHead: number, dist: number, t: number): (Vector3, Vector3)
	local s = sHead - dist
	local p = Path.vec(Bake.P, s)
	local up = Path.vec(Bake.UP, s).Unit
	local tan = Path.vec(Bake.TAN, s).Unit
	local side = tan:Cross(up).Unit
	return p + side * sway(dist, t), up
end

function Spine.pose(t: number): Pose
	local sHead = Path.time(Bake.S_OF_T, t, Bake.L)
	local frames: { [string]: CFrame } = {}
	for _, c in Bake.CHAIN do
		local fp, fu = joint(sHead, c.front, t)
		local bp, bu = joint(sHead, c.back, t)
		local look = (fp - bp).Unit
		local upSum = fu + bu
		local up = (upSum - look * upSum:Dot(look)).Unit
		local back = -look
		frames[c.name] = CFrame.fromMatrix(fp, up:Cross(back), up, back)
	end
	return {
		t = t,
		sHead = sHead,
		frames = frames,
		dash = Path.scalar(Bake.DASH, sHead),
		flare = Path.scalar(Bake.FLARE, sHead),
		fold = math.clamp(Path.scalar(Bake.FOLD, sHead), 0, 1),
		spread = math.clamp(Path.scalar(Bake.SPREAD, sHead), 0, 1),
		glide = math.clamp(Path.scalar(Bake.GLIDE, sHead), 0, 1),
		phase = Path.time(Bake.PHASE, t, TAU * Bake.CYCLES),
		move = Path.moveName(sHead),
	}
end

function Spine.wingAngles(p: Pose): (number, number)
	local amp = (32 - 28 * p.glide) * (1 - p.spread) + 3 * p.spread
	local bias = 4 + 12 * p.spread
	local inner = (bias + amp * math.sin(p.phase)) * D
	local outer = 0.45 * amp * math.sin(p.phase - 0.9) * D - 6 * p.spread * D
	inner += (-70 * D - inner) * p.fold
	outer += (155 * D - outer) * p.fold
	return inner, outer
end

function Spine.jawAngle(p: Pose): number
	return (28 * p.flare + 2 + 2 * math.sin(p.t * math.pi / 2)) * D
end

-- Rotation by `angle` about the line through `point` along `axis` (anchor-local).
function Spine.aboutAxis(point: Vector3, axis: Vector3, angle: number): CFrame
	return CFrame.new(point) * CFrame.fromAxisAngle(axis, angle) * CFrame.new(-point)
end

-- Anchor-local transform of each moving sub-part (identity for parts glued to their anchor).
function Spine.subParts(p: Pose): { [string]: CFrame }
	local inner, outer = Spine.wingAngles(p)
	local out: { [string]: CFrame } = {}
	for side, ax in Bake.WING do
		local ci = Spine.aboutAxis(ax.S, ax.ki, inner)
		local co = ci * Spine.aboutAxis(ax.E, ax.ko, outer)
		out["Wing" .. side .. "Inner"] = ci
		out["Wing" .. side .. "InnerMem"] = ci
		out["Wing" .. side .. "Outer"] = co
		out["Wing" .. side .. "OuterMem"] = co
	end
	out.Jaw = Spine.aboutAxis(Bake.JAW_HINGE, Vector3.xAxis, -Spine.jawAngle(p))
	return out
end

return Spine
