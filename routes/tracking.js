// routes/tracking.js - Tracking Routes (Called by Roblox Scripts)
const express = require('express');
const db = require('../database');

const router = express.Router();

// Verify and track license usage
router.post('/verify', (req, res) => {
    try {
        const { productKey, placeId, gameName, playerName, playerId } = req.body;

        if (!productKey || !placeId) {
            return res.status(400).json({ 
                error: 'Product key and Place ID are required',
                whitelisted: false,
                isActive: false
            });
        }

        // Find product
        const product = db.prepare('SELECT * FROM products WHERE product_key = ?').get(productKey);
        if (!product) {
            return res.status(404).json({ 
                error: 'Invalid product key',
                whitelisted: false,
                isActive: false
            });
        }

        // Log the usage
        db.prepare(`
            INSERT INTO usage_logs (product_id, place_id, game_name, player_name, player_id)
            VALUES (?, ?, ?, ?, ?)
        `).run(product.id, placeId, gameName || 'Unknown', playerName || 'Server', playerId || '0');

        // Check whitelist status
        const whitelist = db.prepare(`
            SELECT * FROM whitelist 
            WHERE product_id = ? AND place_id = ?
        `).get(product.id, placeId);

        let response = {
            success: true,
            productId: product.id,
            placeId: placeId
        };

        if (!whitelist) {
            // Not in whitelist - pending status (notyetcheck)
            // By default, allow it to run
            response.whitelisted = null; // null = not yet checked
            response.isActive = true;
            response.status = 'notyetcheck';
            response.message = 'Place not in whitelist - running in pending mode';
        } else {
            // In whitelist - check status
            response.whitelisted = whitelist.status === 'whitelisted';
            response.isActive = whitelist.is_active === 1;
            response.status = whitelist.status;
            
            if (whitelist.status === 'unwhitelisted' || whitelist.is_active === 0) {
                response.message = 'Place is unwhitelisted or deactivated';
            } else if (whitelist.status === 'pending') {
                response.message = 'Place is pending verification';
            } else {
                response.message = 'Place is whitelisted and active';
            }
        }

        res.json(response);
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ 
            error: 'Server error',
            whitelisted: false,
            isActive: true // Default to true on error to not break games
        });
    }
});

// Simple ping endpoint for health check
router.get('/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get stats (public endpoint for product key)
router.get('/stats/:productKey', (req, res) => {
    try {
        const product = db.prepare('SELECT id FROM products WHERE product_key = ?').get(req.params.productKey);
        if (!product) {
            return res.status(404).json({ error: 'Invalid product key' });
        }

        const stats = db.prepare(`
            SELECT 
                COUNT(DISTINCT place_id) as unique_places,
                COUNT(*) as total_requests,
                MAX(timestamp) as last_request
            FROM usage_logs
            WHERE product_id = ?
        `).get(product.id);

        res.json({ stats });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
