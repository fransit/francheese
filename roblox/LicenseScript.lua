--[[
    ╔═══════════════════════════════════════════════════════════════════════════════╗
    ║                     ROBLOX LICENSE SYSTEM - SERVER SCRIPT                     ║
    ╠═══════════════════════════════════════════════════════════════════════════════╣
    ║  Place this script in ServerScriptService                                     ║
    ║                                                                               ║
    ║  SETUP INSTRUCTIONS:                                                          ║
    ║  1. Create a product on the license platform                                  ║
    ║  2. Copy the generated script (it will have your product key)                 ║
    ║  3. Paste into a Script in ServerScriptService                                ║
    ║  4. Enable HTTP Requests in Game Settings > Security                          ║
    ║                                                                               ║
    ║  HOW IT WORKS:                                                                ║
    ║  - Script sends verification request on server start                          ║
    ║  - Tracks player joins                                                        ║
    ║  - Checks whitelist status periodically                                       ║
    ║  - Default: Allows all (pending) unless explicitly unwhitelisted              ║
    ╚═══════════════════════════════════════════════════════════════════════════════╝
    
    ⚠️ THIS IS A TEMPLATE - USE THE GENERATED SCRIPT FROM YOUR DASHBOARD
    ⚠️ The generated script will have your actual product key
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

--[[ ═══════════════════════════════════════════════════════════════
     CONFIGURATION - REPLACE WITH YOUR VALUES
     ═══════════════════════════════════════════════════════════════ ]]

local CONFIG = {
    -- ⚠️ REPLACE THIS WITH YOUR PRODUCT KEY FROM THE DASHBOARD
    PRODUCT_KEY = "YOUR-PRODUCT-KEY-HERE",
    
    -- ⚠️ REPLACE THIS WITH YOUR SERVER URL (e.g., "https://your-domain.com")
    API_URL = "https://YOUR-DOMAIN.com/api/track",
    
    -- How often to check license status (in seconds)
    CHECK_INTERVAL = 300, -- 5 minutes
    
    -- Set to false to disable the license system
    ENABLED = true,
    
    -- Set to true to print debug messages
    DEBUG = true
}

--[[ ═══════════════════════════════════════════════════════════════
     LICENSE SYSTEM MODULE
     ═══════════════════════════════════════════════════════════════ ]]

local LicenseSystem = {}

-- License status
LicenseSystem.Status = {
    Whitelisted = nil,      -- true/false/nil (nil = pending/not checked)
    IsActive = true,        -- true/false
    LastCheck = 0,
    CheckCount = 0
}

-- Debug print
local function debugPrint(...)
    if CONFIG.DEBUG then
        print("[License]", ...)
    end
end

-- Get game information
local function getGameInfo()
    local success, productInfo = pcall(function()
        return MarketplaceService:GetProductInfo(game.PlaceId)
    end)
    
    return {
        placeId = tostring(game.PlaceId),
        gameName = success and productInfo.Name or "Unknown Game",
        privateServerId = game.PrivateServerId,
        privateServerOwnerId = game.PrivateServerOwnerId,
        jobId = game.JobId
    }
end

-- Send tracking/verification request
local function sendRequest(playerInfo)
    if not CONFIG.ENABLED then
        debugPrint("License system is disabled")
        return nil
    end
    
    local gameInfo = getGameInfo()
    
    local requestData = {
        productKey = CONFIG.PRODUCT_KEY,
        placeId = gameInfo.placeId,
        gameName = gameInfo.gameName,
        playerName = playerInfo and playerInfo.Name or "Server",
        playerId = playerInfo and tostring(playerInfo.UserId) or "0"
    }
    
    debugPrint("Sending verification request...")
    debugPrint("  Place ID:", gameInfo.placeId)
    debugPrint("  Game Name:", gameInfo.gameName)
    
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = CONFIG.API_URL .. "/verify",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = HttpService:JSONEncode(requestData)
        })
    end)
    
    if not success then
        warn("[License] HTTP Request failed:", response)
        return nil
    end
    
    if not response.Success then
        warn("[License] Server returned error:", response.StatusCode, response.StatusMessage)
        return nil
    end
    
    local responseSuccess, responseData = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)
    
    if not responseSuccess then
        warn("[License] Failed to decode response")
        return nil
    end
    
    -- Update status
    LicenseSystem.Status.Whitelisted = responseData.whitelisted
    LicenseSystem.Status.IsActive = responseData.isActive ~= false
    LicenseSystem.Status.LastCheck = os.time()
    LicenseSystem.Status.CheckCount = LicenseSystem.Status.CheckCount + 1
    
    debugPrint("Response received:")
    debugPrint("  Whitelisted:", tostring(responseData.whitelisted))
    debugPrint("  Is Active:", tostring(responseData.isActive))
    debugPrint("  Status:", responseData.status or "unknown")
    debugPrint("  Message:", responseData.message or "none")
    
    return responseData
end

-- Check if license is valid
-- Returns true if:
--   1. Place is explicitly whitelisted OR
--   2. Place is in pending status (not yet checked) AND active
-- Returns false if:
--   1. Place is explicitly unwhitelisted OR
--   2. Place has been deactivated
function LicenseSystem:IsValid()
    -- If explicitly unwhitelisted
    if self.Status.Whitelisted == false then
        return false
    end
    
    -- If deactivated
    if self.Status.IsActive == false then
        return false
    end
    
    -- Otherwise (whitelisted or pending), allow
    return true
end

-- Get current status
function LicenseSystem:GetStatus()
    return {
        whitelisted = self.Status.Whitelisted,
        active = self.Status.IsActive,
        lastCheck = self.Status.LastCheck,
        checkCount = self.Status.CheckCount
    }
end

-- Get status string
function LicenseSystem:GetStatusString()
    if self.Status.Whitelisted == true then
        return "WHITELISTED"
    elseif self.Status.Whitelisted == false then
        return "UNWHITELISTED"
    else
        return "PENDING"
    end
end

--[[ ═══════════════════════════════════════════════════════════════
     INITIALIZATION
     ═══════════════════════════════════════════════════════════════ ]]

local function initialize()
    print("═══════════════════════════════════════════════════════")
    print("          ROBLOX LICENSE SYSTEM INITIALIZING           ")
    print("═══════════════════════════════════════════════════════")
    print("Product Key:", string.sub(CONFIG.PRODUCT_KEY, 1, 8) .. "...")
    print("API URL:", CONFIG.API_URL)
    print("")
    
    -- Initial verification
    local result = sendRequest(nil)
    
    if result then
        print("✅ License verified successfully!")
        print("   Status:", LicenseSystem:GetStatusString())
        print("   Active:", LicenseSystem.Status.IsActive and "Yes" or "No")
    else
        print("⚠️ Could not verify license - running in pending mode")
    end
    
    print("═══════════════════════════════════════════════════════")
    
    -- Handle based on license status
    if not LicenseSystem:IsValid() then
        warn("❌ LICENSE INVALID - This place is not authorized!")
        warn("   The product owner has unwhitelisted or deactivated this place.")
        -- Add your own logic here (e.g., kick players, disable features)
    end
end

--[[ ═══════════════════════════════════════════════════════════════
     EVENT HANDLERS
     ═══════════════════════════════════════════════════════════════ ]]

-- Track player joins
Players.PlayerAdded:Connect(function(player)
    debugPrint("Player joined:", player.Name)
    sendRequest(player)
end)

-- Periodic verification
spawn(function()
    while true do
        wait(CONFIG.CHECK_INTERVAL)
        debugPrint("Running periodic check...")
        sendRequest(nil)
        
        -- Check validity after each update
        if not LicenseSystem:IsValid() then
            warn("[License] License became invalid during runtime!")
            -- Add your own logic here
        end
    end
end)

--[[ ═══════════════════════════════════════════════════════════════
     START
     ═══════════════════════════════════════════════════════════════ ]]

-- Run initialization
initialize()

-- Return the module for external use
return LicenseSystem


--[[
    ╔═══════════════════════════════════════════════════════════════════════════════╗
    ║                              USAGE EXAMPLE                                    ║
    ╚═══════════════════════════════════════════════════════════════════════════════╝
    
    In another script, you can require this module and check the license:
    
    local LicenseSystem = require(script.Parent.LicenseScript)
    
    -- Check if license is valid
    if LicenseSystem:IsValid() then
        print("License is valid! Running main code...")
        -- Your main code here
    else
        print("License is invalid!")
        -- Handle invalid license (disable features, etc.)
    end
    
    -- Get detailed status
    local status = LicenseSystem:GetStatus()
    print("Whitelisted:", status.whitelisted)
    print("Active:", status.active)
    print("Check count:", status.checkCount)
]]
