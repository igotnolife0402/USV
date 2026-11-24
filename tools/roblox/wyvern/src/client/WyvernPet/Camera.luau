--!strict
-- Cinematic showcase camera + post pass (cinematic baseline: orbit loop, one payoff at the flare).
-- Plays the baked track in Bake.CAM on clock time; Warp() maps clock -> story time (slow-mo + hit-stop, loop stays 16 s).
-- Everything it changes (camera type, FOV, Lighting effects) is restored by stop().
local Lighting = game:GetService("Lighting")
local Bake = require(script.Parent.Bake)

local CAM = Bake.CAM
local NT, DT, LOOP = Bake.NT, Bake.DT, Bake.LOOP_LEN

local Camera = {}

export type State = {
	camera: Camera,
	oldType: Enum.CameraType,
	oldFov: number,
	oldSubject: Instance?,
	bloom: BloomEffect?,
	cc: ColorCorrectionEffect?,
	dof: DepthOfFieldEffect?,
}

local POST = {
	bloom = { Intensity = 0.6, Size = 24, Threshold = 1.6 },
	cc = { Saturation = 0.1, Contrast = 0.08 },
	dof = { InFocusRadius = 30, FarIntensity = 0.25, NearIntensity = 0 },
}

local function cr(a: number, b: number, c: number, d: number, u: number): number
	return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u)
end

local function index(c: number): (number, number)
	local x = (c % LOOP) / DT
	local i = math.floor(x)
	return i, x - i
end

-- linear lookup on an NT+1 clock table (keeps the hit-stop flat and the flash peak exact)
local function linear(arr: { number }, c: number, period: number): number
	local i, u = index(c)
	local a = arr[i + 1]
	local b = if i + 1 <= NT then arr[i + 2] else arr[2] + period
	return a + (b - a) * u
end

-- Catmull-Rom on a flat Vector3 clock table (sample NT equals sample 0)
local function vec(arr: { number }, c: number): Vector3
	local i, u = index(c)
	local function g(k: number): Vector3
		local w = k % NT
		local o = w * 3
		return Vector3.new(arr[o + 1], arr[o + 2], arr[o + 3])
	end
	local a, b, cc, d = g(i - 1 + NT), g(i), g(i + 1), g(i + 2)
	return Vector3.new(cr(a.X, b.X, cc.X, d.X, u), cr(a.Y, b.Y, cc.Y, d.Y, u), cr(a.Z, b.Z, cc.Z, d.Z, u))
end

local function scalar(arr: { number }, c: number): number
	local i, u = index(c)
	local function g(k: number): number
		return arr[(k % NT) + 1]
	end
	return cr(g(i - 1 + NT), g(i), g(i + 1), g(i + 2), u)
end

function Camera.warp(c: number): number
	return linear(CAM.WARP, c, LOOP)
end

local function make<T>(className: string, props: { [string]: any }): T
	local inst = Instance.new(className)
	inst.Name = "WyvernPet" .. className
	for k, v in props do
		(inst :: any)[k] = v
	end
	inst.Parent = Lighting
	return (inst :: any) :: T
end

function Camera.start(usePost: boolean): State?
	local camera = workspace.CurrentCamera
	if not camera then
		return nil
	end
	local s: State = {
		camera = camera,
		oldType = camera.CameraType,
		oldFov = camera.FieldOfView,
		oldSubject = camera.CameraSubject,
	}
	camera.CameraType = Enum.CameraType.Scriptable
	if usePost then
		s.bloom = make("BloomEffect", POST.bloom)
		s.cc = make("ColorCorrectionEffect", POST.cc)
		s.dof = make("DepthOfFieldEffect", POST.dof)
	end
	return s
end

-- c = clock time in the loop; center = the player centre frame; scale = CONFIG.SCALE; focusWorld = wyvern torso in world space
function Camera.update(s: State, c: number, center: CFrame, scale: number, focusWorld: Vector3)
	local pos = center * (vec(CAM.POS, c) * scale)
	local look = center * (vec(CAM.LOOK, c) * scale)
	local cf = CFrame.lookAt(pos, look)
	local amp = linear(CAM.SHAKE, c, 0) * scale
	if amp > 1e-3 then
		-- smooth noise shake in the camera plane (decays with the baked amplitude)
		local x = math.noise(c * 18, 0.3, 1.7)
		local y = math.noise(0.9, c * 18, 4.1)
		cf = cf * CFrame.new(x * amp, y * amp, 0)
	end
	s.camera.CFrame = cf
	s.camera.FieldOfView = scalar(CAM.FOV, c)
	if s.cc then
		s.cc.Brightness = linear(CAM.FLASH, c, 0)
	end
	if s.dof then
		s.dof.FocusDistance = (focusWorld - pos).Magnitude
	end
end

function Camera.stop(s: State)
	s.camera.CameraType = s.oldType
	s.camera.FieldOfView = s.oldFov
	if s.oldSubject then
		s.camera.CameraSubject = s.oldSubject
	end
	if s.bloom then
		s.bloom:Destroy()
	end
	if s.cc then
		s.cc:Destroy()
	end
	if s.dof then
		s.dof:Destroy()
	end
end

return Camera
