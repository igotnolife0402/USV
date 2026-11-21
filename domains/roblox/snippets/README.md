# Roblox snippets

Belongs here: small, tested Luau modules/scripts reused across places (data saving, remotes, debounce, UI scaling, tween helpers).
Naming: `<what>.luau` (e.g. `datastore-save.luau`, `remote-guard.luau`). One concern per file, `--!strict` header, no place-specific names.

## Debounced touch pickup (server)
```lua
--!strict
local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")
local cooldown: {[number]: number} = {}
for _, part in CollectionService:GetTagged("Coin") do
	(part :: BasePart).Touched:Connect(function(hit)
		local plr = Players:GetPlayerFromCharacter(hit.Parent)
		if not plr then return end
		local now = os.clock()
		if (cooldown[plr.UserId] or 0) > now then return end
		cooldown[plr.UserId] = now + 0.5
		local ls = plr:FindFirstChild("leaderstats")
		local coins = ls and ls:FindFirstChild("Coins") :: IntValue?
		if coins then coins.Value += 1 end
		part:Destroy()
	end)
end
```

## Safe DataStore save with retry
```lua
--!strict
local store = game:GetService("DataStoreService"):GetDataStore("PlayerData_v1")
local function save(userId: number, data: {[string]: any})
	for attempt = 1, 3 do
		local ok, err = pcall(function()
			store:UpdateAsync("u_" .. userId, function() return data end)
		end)
		if ok then return true end
		warn("save failed", attempt, err)
		task.wait(2 ^ attempt)
	end
	return false
end
return save
```

## Validated RemoteEvent (server)
```lua
--!strict
local remote = game:GetService("ReplicatedStorage"):WaitForChild("BuyItem") :: RemoteEvent
local last: {[number]: number} = {}
remote.OnServerEvent:Connect(function(plr, itemId)
	if typeof(itemId) ~= "string" or #itemId > 32 then return end
	if os.clock() - (last[plr.UserId] or 0) < 0.25 then return end
	last[plr.UserId] = os.clock()
	-- server looks up price; never trust a client price
end)
```
