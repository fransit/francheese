// routes/products.js - Product Management Routes
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all products for current user
router.get('/', authenticateToken, (req, res) => {
    try {
        const products = db.prepare(`
            SELECT 
                p.*,
                (SELECT COUNT(DISTINCT place_id) FROM usage_logs WHERE product_id = p.id) as user_count
            FROM products p
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
        `).all(req.user.id);

        res.json({ products });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single product
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const product = db.prepare(`
            SELECT 
                p.*,
                (SELECT COUNT(DISTINCT place_id) FROM usage_logs WHERE product_id = p.id) as user_count
            FROM products p
            WHERE p.id = ? AND p.user_id = ?
        `).get(req.params.id, req.user.id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ product });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create product
router.post('/', authenticateToken, (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Product name is required' });
        }

        // Generate unique product key
        const productKey = uuidv4();

        const result = db.prepare(`
            INSERT INTO products (user_id, product_key, name, description)
            VALUES (?, ?, ?, ?)
        `).run(req.user.id, productKey, name, description || '');

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

        // Generate Roblox script
        const robloxScript = generateRobloxScript(productKey, req.headers.host || 'YOUR_DOMAIN');

        res.status(201).json({ 
            message: 'Product created successfully',
            product,
            robloxScript
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update product
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const { name, description } = req.body;

        const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        db.prepare(`
            UPDATE products SET name = ?, description = ? WHERE id = ?
        `).run(name || product.name, description || product.description, req.params.id);

        const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

        res.json({ 
            message: 'Product updated successfully',
            product: updatedProduct 
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete product
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get product script
router.get('/:id/script', authenticateToken, (req, res) => {
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const robloxScript = generateRobloxScript(product.product_key, req.headers.host || 'YOUR_DOMAIN');

        res.json({ script: robloxScript });
    } catch (error) {
        console.error('Get script error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get product usage logs (users)
router.get('/:id/users', authenticateToken, (req, res) => {
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Get unique place IDs with their info and whitelist status
        const users = db.prepare(`
            SELECT 
                ul.place_id,
                ul.game_name,
                MAX(ul.timestamp) as last_seen,
                COUNT(*) as request_count,
                COALESCE(w.status, 'notyetcheck') as whitelist_status,
                COALESCE(w.is_active, 1) as is_active
            FROM usage_logs ul
            LEFT JOIN whitelist w ON w.product_id = ul.product_id AND w.place_id = ul.place_id
            WHERE ul.product_id = ?
            GROUP BY ul.place_id
            ORDER BY ul.timestamp DESC
        `).all(req.params.id);

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate Roblox Script
function generateRobloxScript(productKey, domain) {
    return `--[[
    ╔═══════════════════════════════════════════════════════════════╗
    ║           ROBLOX LICENSE SYSTEM - SERVER SCRIPT               ║
    ║      Place this in ServerScriptService                        ║
    ╚═══════════════════════════════════════════════════════════════╝
    
    Product Key: ${productKey}
    Generated: ${new Date().toISOString()}
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- Configuration
local CONFIG = {
    PRODUCT_KEY = "${productKey}",
    API_URL = "https://${domain}/api/track",
    CHECK_INTERVAL = 300, -- Check every 5 minutes
    ENABLED = true
}

-- License System Module
local LicenseSystem = {}
LicenseSystem.IsWhitelisted = nil
LicenseSystem.IsActive = true

-- Get game info
local function getGameInfo()
    return {
        placeId = tostring(game.PlaceId),
        gameName = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name or "Unknown",
        privateServerId = game.PrivateServerId,
        privateServerOwnerId = game.PrivateServerOwnerId
    }
end

-- Send tracking request
local function sendTrackingRequest(playerInfo)
    if not CONFIG.ENABLED then return end
    
    local gameInfo = getGameInfo()
    
    local data = {
        productKey = CONFIG.PRODUCT_KEY,
        placeId = gameInfo.placeId,
        gameName = gameInfo.gameName,
        playerName = playerInfo and playerInfo.Name or "Server",
        playerId = playerInfo and tostring(playerInfo.UserId) or "0"
    }
    
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = CONFIG.API_URL .. "/verify",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = HttpService:JSONEncode(data)
        })
    end)
    
    if success and response.Success then
        local responseData = HttpService:JSONDecode(response.Body)
        LicenseSystem.IsWhitelisted = responseData.whitelisted
        LicenseSystem.IsActive = responseData.isActive
        
        -- Log response
        if responseData.whitelisted == false and responseData.isActive == false then
            warn("[License] This place is UNWHITELISTED and DEACTIVATED")
            -- You can add your own logic here (e.g., kick players, disable features)
        elseif responseData.whitelisted == false then
            print("[License] Place not yet verified - running in pending mode")
        else
            print("[License] Place is whitelisted and active")
        end
        
        return responseData
    else
        warn("[License] Failed to verify license:", response and response.StatusMessage or "Unknown error")
        return nil
    end
end

-- Initial verification on server start
local function initialize()
    print("[License] Initializing license system...")
    local result = sendTrackingRequest(nil)
    
    if result then
        print("[License] License verified successfully")
        print("[License] Whitelist Status:", result.whitelisted and "WHITELISTED" or (result.status == "unwhitelisted" and "UNWHITELISTED" or "PENDING"))
        print("[License] Active:", result.isActive and "YES" or "NO")
    end
end

-- Track player joins
Players.PlayerAdded:Connect(function(player)
    sendTrackingRequest(player)
end)

-- Periodic check
spawn(function()
    while true do
        wait(CONFIG.CHECK_INTERVAL)
        sendTrackingRequest(nil)
    end
end)

-- Public API
function LicenseSystem:IsLicenseValid()
    -- Returns true if not explicitly unwhitelisted AND is active
    -- Pending (notyetcheck) status allows running
    return self.IsActive ~= false and self.IsWhitelisted ~= false
end

function LicenseSystem:GetStatus()
    return {
        whitelisted = self.IsWhitelisted,
        active = self.IsActive
    }
end

-- Initialize
initialize()

return LicenseSystem
`;
}

module.exports = router;
