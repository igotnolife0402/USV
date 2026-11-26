--!strict
-- Floats the local character in the middle of the loop in the anime pose (R15). Client-only visual.
-- Start() anchors the root, stops the default animations and offsets Motor6D C0s; Stop() restores everything.
local Bake = require(script.Parent.Bake)

local PlayerPose = {}

type Saved = {
	c0: { [Motor6D]: CFrame },
	animate: LocalScript?,
	animateWasEnabled: boolean,
	rootAnchored: boolean,
}

local saved: Saved? = nil
local D = math.pi / 180

-- Returns the centre CFrame of the loop (root start + float height, facing the character's front with +Z).
function PlayerPose.start(character: Model): CFrame?
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local root = character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not humanoid or not root then
		return nil
	end
	if humanoid.RigType ~= Enum.HumanoidRigType.R15 then
		warn("[WyvernPet] pose needs an R15 character; floating without the pose")
	end
	local s: Saved = { c0 = {}, animate = nil, animateWasEnabled = false, rootAnchored = root.Anchored }
	local animate = character:FindFirstChild("Animate")
	if animate and animate:IsA("LocalScript") then
		s.animate = animate
		s.animateWasEnabled = animate.Enabled
		animate.Enabled = false
	end
	local animator = humanoid:FindFirstChildOfClass("Animator")
	if animator then
		for _, track in animator:GetPlayingAnimationTracks() do
			track:Stop(0.2)
		end
	end
	for name, deg in Bake.PLAYER_POSE do
		local motor = character:FindFirstChild(name, true)
		if motor and motor:IsA("Motor6D") then
			s.c0[motor] = motor.C0
			motor.C0 = motor.C0 * CFrame.Angles(deg[1] * D, deg[2] * D, deg[3] * D)
		end
	end
	saved = s
	root.Anchored = true
	local _, yaw, _ = root.CFrame:ToOrientation()
	-- spec +Z is the player's front; Roblox front is -Z, so turn the path frame half a turn
	return CFrame.new(root.Position + Vector3.new(0, Bake.PLAYER_FLOAT.height, 0)) * CFrame.Angles(0, yaw + math.pi, 0)
end

-- Bob + slow 360 spin per loop; centre stays fixed so the wyvern path is world-stable.
function PlayerPose.update(character: Model, center: CFrame, t: number)
	local root = character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return
	end
	local f = Bake.PLAYER_FLOAT
	local bob = f.bob * math.sin(t * 2 * math.pi / f.bobPeriod)
	local spin = t * 2 * math.pi / Bake.LOOP_LEN
	root.CFrame = center * CFrame.new(0, bob, 0) * CFrame.Angles(0, math.pi + spin, 0)
end

function PlayerPose.stop(character: Model?)
	local s = saved
	if not s then
		return
	end
	saved = nil
	for motor, c0 in s.c0 do
		if motor.Parent then
			motor.C0 = c0
		end
	end
	if s.animate and s.animate.Parent then
		s.animate.Enabled = s.animateWasEnabled
	end
	local root = if character then character:FindFirstChild("HumanoidRootPart") :: BasePart? else nil
	if root then
		root.Anchored = s.rootAnchored
	end
end

return PlayerPose
