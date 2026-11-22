--!strict
-- bot-watch.luau: watches game bots during a Studio play and counts their faults per round.
-- Use: start play, run this file with execute_luau (datamodel Server); it spawns and returns at once.
-- Read later with a short call: return workspace:GetAttribute("BotWatch")  (JSON, ends " DONE" when finished)
-- Needs from the game: a bots folder, a "playing" model attribute, a round attribute on workspace,
-- a Studio-only force attribute the vote reads, and character counters the game bumps (Knocks, Outs, Hops).
local CFG = {
	bots = "MMBots",
	playing = "MMPlaying",
	round = "MMRound",
	force = "MMForce",
	games = { "ObstacleRush", "SpinSweep", "BoulderPeak", "BombRain", "HotPotato" },
	maxPerRound = 80,
	hazards = { "Boulder", "Spin", "Ham", "Sweeper", "Bomb", "Blast" },
	counters = { "Knocks", "Outs", "Hops", "Dodges" },
}
local HttpService = game:GetService("HttpService")
local LogService = game:GetService("LogService")
local op = OverlapParams.new()
op.FilterType = Enum.RaycastFilterType.Exclude

local function hazardNear(pos: Vector3, ex: { Instance }, gid: string): string?
	op.FilterDescendantsInstances = ex
	for _, p in workspace:GetPartBoundsInRadius(pos, 5, op) do
		local cur: Instance? = p
		for _ = 1, 3 do -- part, its model, one more: never the arena model (named after the game)
			if not cur or cur == workspace or cur.Name == gid then
				break
			end
			for _, h in CFG.hazards do
				if string.find(cur.Name, h, 1, true) then
					return h
				end
			end
			cur = cur.Parent
		end
	end
	return nil
end

local function flat(v: Vector3): Vector3
	return Vector3.new(v.X, 0, v.Z)
end

local function watchRound(gid: string): any
	local bots = workspace:FindFirstChild(CFG.bots)
	local recs: { [Instance]: any } = {}
	local errs0 = #LogService:GetLogHistory()
	local tick, t0 = 0, os.clock()
	while workspace:GetAttribute(CFG.round) == gid and os.clock() - t0 < CFG.maxPerRound do
		task.wait(0.1)
		tick += 1
		local live = {}
		for _, b in (if bots then bots:GetChildren() else {}) do
			local h = b:FindFirstChild("HumanoidRootPart")
			local hum = b:FindFirstChildOfClass("Humanoid")
			if h and h:IsA("BasePart") and hum then
				local r = recs[b]
				if not r then
					r = { n = 0, mv = 0, spd = 0, sharp = 0, jumps = 0, conga = 0, near = 0, nearBy = {}, stall = 0, idle = 0, falls = 0, fallT = 0, hist = {}, cnt = {}, add = {} }
					recs[b] = r
				end
				for _, k in CFG.counters do -- positive deltas survive respawns
					local v = b:GetAttribute(k) or 0
					local last = r.cnt[k] or v
					if v > last then
						r.add[k] = (r.add[k] or 0) + v - last
					end
					r.cnt[k] = v
				end
				if b:GetAttribute(CFG.playing) and not h.Anchored and hum.Health > 0 then
					r.n += 1
					local v = flat(h.AssemblyLinearVelocity)
					local st = hum:GetState()
					if v.Magnitude > 6 then
						r.mv += 1
						r.spd += v.Magnitude
						local d = v.Unit
						if r.dir and r.dir:Dot(d) < 0.5 and st == Enum.HumanoidStateType.Running then
							r.sharp += 1 -- > 60 degree snap in 0.1 s on the ground
						end
						r.dir = d
					end
					if st == Enum.HumanoidStateType.Jumping and not r.wasJump then
						r.jumps += 1
					end
					r.wasJump = st == Enum.HumanoidStateType.Jumping
					if st == Enum.HumanoidStateType.Freefall then
						r.fallT += 0.1
					else
						if r.fallT > 1.5 then
							r.falls += 1
						end
						r.fallT = 0
					end
					if tick % 3 == 0 then
						local hz = hazardNear(h.Position, { bots :: Instance }, gid)
						if hz then
							r.near += 1
							r.nearBy[hz] = (r.nearBy[hz] or 0) + 1
						end
					end
					table.insert(r.hist, h.Position)
					if #r.hist > 20 then
						table.remove(r.hist, 1)
					end
					if tick % 20 == 0 and #r.hist == 20 and (h.Position - r.hist[1]).Magnitude < 1.5 then
						if flat(hum.WalkToPoint - h.Position).Magnitude > 4 then
							r.stall += 1 -- wants to move, did not move for 2 s
						else
							r.idle += 1 -- standing still for 2 s
						end
					end
					table.insert(live, { h = h, v = v })
				end
			end
		end
		for i, a in live do -- same-heading bots within 3.5 studs: conga lines
			for j, b in live do
				if i ~= j and a.v.Magnitude > 6 and b.v.Magnitude > 6 and (a.h.Position - b.h.Position).Magnitude < 3.5 and a.v.Unit:Dot(b.v.Unit) > 0.9 then
					local r = recs[a.h.Parent :: Instance]
					r.conga += 1
					break
				end
			end
		end
	end
	local secs = os.clock() - t0
	local S = { game = gid, secs = math.floor(secs), bots = 0, knocks = 0, outs = 0, hops = 0, stall2s = 0, idle2s = 0, falls = 0, nearBy = {} }
	local n, mv, spd, sharp, jumps, conga, near = 0, 0, 0, 0, 0, 0, 0
	for _, r in recs do
		if r.n > 0 then
			S.bots += 1
			n += r.n
			mv += r.mv
			spd += r.spd
			sharp += r.sharp
			jumps += r.jumps
			conga += r.conga
			near += r.near
			S.stall2s += r.stall
			S.idle2s += r.idle
			S.falls += r.falls
			S.knocks += r.add.Knocks or 0
			S.outs += r.add.Outs or 0
			S.hops += r.add.Hops or 0
			S.dodges = (S.dodges or 0) + (r.add.Dodges or 0)
			for k, c in r.nearBy do
				S.nearBy[k] = (S.nearBy[k] or 0) + c
			end
		end
	end
	local mins = math.max(n / 600, 1e-3) -- bot-minutes
	S.botMin = math.floor(mins * 10) / 10
	S.knocksPerBotMin = math.floor(10 * S.knocks / mins) / 10
	S.sharpPerMin = math.floor(sharp / mins)
	S.jumpsPerMin = math.floor(jumps / mins)
	S.movingPct = math.floor(100 * mv / math.max(n, 1))
	S.avgSpeed = math.floor(spd / math.max(mv, 1))
	S.congaPct = math.floor(100 * conga / math.max(n, 1))
	S.nearPct = math.floor(100 * near * 3 / math.max(n, 1))
	local errs = {}
	local hist = LogService:GetLogHistory()
	for i = errs0 + 1, #hist do
		local m = hist[i]
		if m.messageType == Enum.MessageType.MessageError or m.messageType == Enum.MessageType.MessageWarning then
			table.insert(errs, m.message:sub(1, 120))
		end
	end
	S.errors = errs
	return S
end

task.spawn(function()
	local results = {}
	local function save(tail: string)
		workspace:SetAttribute("BotWatch", HttpService:JSONEncode(results) .. tail)
	end
	for _, gid in CFG.games do
		workspace:SetAttribute(CFG.force, gid)
		local t0 = os.clock()
		while workspace:GetAttribute(CFG.round) ~= gid and os.clock() - t0 < 150 do
			task.wait(0.25)
		end
		if workspace:GetAttribute(CFG.round) ~= gid then
			table.insert(results, { game = gid, err = "never started; round=" .. tostring(workspace:GetAttribute(CFG.round)) })
		else
			table.insert(results, watchRound(gid))
			while workspace:GetAttribute(CFG.round) == gid do
				task.wait(0.25)
			end
		end
		save(" ...")
	end
	workspace:SetAttribute(CFG.force, nil)
	save(" DONE")
end)
return "bot-watch started; round=" .. tostring(workspace:GetAttribute(CFG.round))
