// server.js - Main Server Entry Point
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database
require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const whitelistRoutes = require('./routes/whitelist');
const trackingRoutes = require('./routes/tracking');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/whitelist', whitelistRoutes);
app.use('/api/track', trackingRoutes);

// Page Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

app.get('/panel/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         ROBLOX LICENSE PLATFORM - SERVER STARTED              ║
╠═══════════════════════════════════════════════════════════════╣
║  🚀 Server running on: http://localhost:${PORT}                  ║
║  📁 Static files: /public                                     ║
║  🔗 API endpoints:                                            ║
║     - POST /api/auth/register                                 ║
║     - POST /api/auth/login                                    ║
║     - GET  /api/auth/me                                       ║
║     - GET  /api/products                                      ║
║     - POST /api/products                                      ║
║     - GET  /api/products/:id/users                            ║
║     - GET  /api/products/:id/script                           ║
║     - POST /api/whitelist/product/:productId                  ║
║     - POST /api/track/verify (Roblox endpoint)                ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});
