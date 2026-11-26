--!strict
-- Samples the baked closed path and time tables with Catmull-Rom (same math as motion.mjs `at` / `timeLookup`).
local Bake = require(script.Parent.Bake)

local Path = {}

local N, DS, L = Bake.N, Bake.DS, Bake.L
local NT, DT, LOOP = Bake.NT, Bake.DT, Bake.LOOP_LEN

local function cr(a: number, b: number, c: number, d: number, u: number): number
	return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u)
end

local function wrapIndex(s: number): (number, number)
	local x = (s % L) / DS
	local i = math.floor(x)
	return i % N, x - i
end

-- 0-based sample k of a flat Vector3 array
local function vecAt(arr: { number }, k: number): Vector3
	local o = (k % N) * 3
	return Vector3.new(arr[o + 1], arr[o + 2], arr[o + 3])
end

function Path.vec(arr: { number }, s: number): Vector3
	local i, u = wrapIndex(s)
	local a, b, c, d = vecAt(arr, i - 1 + N), vecAt(arr, i), vecAt(arr, i + 1), vecAt(arr, i + 2)
	return Vector3.new(cr(a.X, b.X, c.X, d.X, u), cr(a.Y, b.Y, c.Y, d.Y, u), cr(a.Z, b.Z, c.Z, d.Z, u))
end

function Path.scalar(arr: { number }, s: number): number
	local i, u = wrapIndex(s)
	local function g(k: number): number
		return arr[(k % N) + 1]
	end
	return cr(g(i - 1 + N), g(i), g(i + 1), g(i + 2), u)
end

-- Time table lookup; period = value gained per loop (L for S_OF_T, 2*pi*CYCLES for PHASE).
function Path.time(arr: { number }, t: number, period: number): number
	local x = (t % LOOP) / DT
	local i = math.floor(x)
	local u = x - i
	local function g(k: number): number
		if k < 0 then
			return arr[k + NT + 1] - period
		elseif k > NT then
			return arr[k - NT + 1] + period
		end
		return arr[k + 1]
	end
	return cr(g(i - 1), g(i), g(i + 1), g(i + 2), u)
end

function Path.moveName(s: number): string
	local i = wrapIndex(s)
	return Bake.MOVE_NAMES[Bake.MOVE[i + 1] + 1]
end

return Path
