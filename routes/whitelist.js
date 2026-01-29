// routes/whitelist.js - Whitelist Management Routes
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all whitelist entries for a product
router.get('/product/:productId', authenticateToken, (req, res) => {
    try {
        // Verify product ownership
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.productId, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const whitelist = db.prepare(`
            SELECT * FROM whitelist 
            WHERE product_id = ?
            ORDER BY created_at DESC
        `).all(req.params.productId);

        res.json({ whitelist });
    } catch (error) {
        console.error('Get whitelist error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add to whitelist
router.post('/product/:productId', authenticateToken, (req, res) => {
    try {
        const { placeId, gameName } = req.body;

        if (!placeId || !gameName) {
            return res.status(400).json({ error: 'Place ID and Game Name are required' });
        }

        // Verify product ownership
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.productId, req.user.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if already exists
        const existing = db.prepare('SELECT * FROM whitelist WHERE product_id = ? AND place_id = ?').get(req.params.productId, placeId);
        if (existing) {
            return res.status(400).json({ error: 'This Place ID is already in the whitelist' });
        }

        // Add to whitelist with 'whitelisted' status
        const result = db.prepare(`
            INSERT INTO whitelist (product_id, place_id, game_name, status, is_active)
            VALUES (?, ?, ?, 'whitelisted', 1)
        `).run(req.params.productId, placeId, gameName);

        const entry = db.prepare('SELECT * FROM whitelist WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({ 
            message: 'Added to whitelist successfully',
            entry 
        });
    } catch (error) {
        console.error('Add whitelist error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update whitelist status (whitelist/unwhitelist)
router.put('/:id/status', authenticateToken, (req, res) => {
    try {
        const { status } = req.body;

        if (!['whitelisted', 'unwhitelisted', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get the whitelist entry and verify ownership
        const entry = db.prepare(`
            SELECT w.*, p.user_id 
            FROM whitelist w
            JOIN products p ON w.product_id = p.id
            WHERE w.id = ?
        `).get(req.params.id);

        if (!entry || entry.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Whitelist entry not found' });
        }

        db.prepare('UPDATE whitelist SET status = ? WHERE id = ?').run(status, req.params.id);

        const updated = db.prepare('SELECT * FROM whitelist WHERE id = ?').get(req.params.id);

        res.json({ 
            message: 'Status updated successfully',
            entry: updated 
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle active state (ON/OFF)
router.put('/:id/toggle', authenticateToken, (req, res) => {
    try {
        // Get the whitelist entry and verify ownership
        const entry = db.prepare(`
            SELECT w.*, p.user_id 
            FROM whitelist w
            JOIN products p ON w.product_id = p.id
            WHERE w.id = ?
        `).get(req.params.id);

        if (!entry || entry.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Whitelist entry not found' });
        }

        const newState = entry.is_active ? 0 : 1;
        
        // If turning OFF, also mark as unwhitelisted
        if (newState === 0) {
            db.prepare('UPDATE whitelist SET is_active = ?, status = ? WHERE id = ?').run(newState, 'unwhitelisted', req.params.id);
        } else {
            db.prepare('UPDATE whitelist SET is_active = ? WHERE id = ?').run(newState, req.params.id);
        }

        const updated = db.prepare('SELECT * FROM whitelist WHERE id = ?').get(req.params.id);

        res.json({ 
            message: `Entry ${newState ? 'activated' : 'deactivated'} successfully`,
            entry: updated 
        });
    } catch (error) {
        console.error('Toggle error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete from whitelist
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        // Get the whitelist entry and verify ownership
        const entry = db.prepare(`
            SELECT w.*, p.user_id 
            FROM whitelist w
            JOIN products p ON w.product_id = p.id
            WHERE w.id = ?
        `).get(req.params.id);

        if (!entry || entry.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Whitelist entry not found' });
        }

        db.prepare('DELETE FROM whitelist WHERE id = ?').run(req.params.id);

        res.json({ message: 'Removed from whitelist successfully' });
    } catch (error) {
        console.error('Delete whitelist error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
