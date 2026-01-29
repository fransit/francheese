// panel.js - Dashboard Functionality

let currentProductId = null;
let products = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = await checkAuth();
    if (!user) return;

    // Update user info in sidebar
    document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userEmail').textContent = user.email;

    // Load data
    await loadProducts();
    updateStats();

    // Setup event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Add product button
    document.getElementById('addProductBtn').addEventListener('click', () => {
        openModal('addProductModal');
    });

    // Add product form
    document.getElementById('addProductForm').addEventListener('submit', handleAddProduct);

    // Add whitelist button
    document.getElementById('addWhitelistBtn').addEventListener('click', () => {
        closeModal('viewUsersModal');
        openModal('addWhitelistModal');
    });

    // Add whitelist form
    document.getElementById('addWhitelistForm').addEventListener('submit', handleAddWhitelist);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
}

// Switch tabs
function switchTab(tab) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tab);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tab}`);
    });
}

// Load products
async function loadProducts() {
    try {
        const data = await apiRequest('/api/products');
        products = data.products;
        renderProducts();
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

// Render products table
function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    const emptyState = document.getElementById('productsEmpty');

    if (products.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        document.querySelector('#tab-products .table-container').classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    document.querySelector('#tab-products .table-container').classList.remove('hidden');

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>
                <strong>${escapeHtml(product.name)}</strong>
                ${product.description ? `<br><small style="color: var(--text-muted);">${escapeHtml(product.description)}</small>` : ''}
            </td>
            <td><span style="color: var(--accent-primary);">${product.user_count || 0}</span> users</td>
            <td>${formatDate(product.created_at)}</td>
            <td>
                <div class="flex gap-1">
                    <button class="btn btn-sm btn-secondary" onclick="viewUsers(${product.id}, '${escapeHtml(product.name)}')">
                        View Users
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="viewScript(${product.id})">
                        Script
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update stats
function updateStats() {
    document.getElementById('statProducts').textContent = products.length;
    
    const totalUsers = products.reduce((sum, p) => sum + (p.user_count || 0), 0);
    document.getElementById('statUsers').textContent = totalUsers;
    
    // These would need additional API calls for accurate data
    document.getElementById('statWhitelisted').textContent = '—';
    document.getElementById('statPending').textContent = '—';
}

// Handle add product
async function handleAddProduct(e) {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDesc').value;
    
    try {
        const data = await apiRequest('/api/products', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
        
        // Show script modal
        closeModal('addProductModal');
        document.getElementById('scriptContent').textContent = data.robloxScript;
        openModal('viewScriptModal');
        
        // Reset form and reload products
        document.getElementById('addProductForm').reset();
        await loadProducts();
        updateStats();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// View script
async function viewScript(productId) {
    try {
        const data = await apiRequest(`/api/products/${productId}/script`);
        document.getElementById('scriptContent').textContent = data.script;
        openModal('viewScriptModal');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Copy script
function copyScript() {
    const script = document.getElementById('scriptContent').textContent;
    navigator.clipboard.writeText(script).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
        }, 2000);
    });
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) {
        return;
    }
    
    try {
        await apiRequest(`/api/products/${productId}`, { method: 'DELETE' });
        await loadProducts();
        updateStats();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// View users
async function viewUsers(productId, productName) {
    currentProductId = productId;
    document.getElementById('viewUsersProductName').textContent = productName;
    
    try {
        const data = await apiRequest(`/api/products/${productId}/users`);
        renderUsers(data.users);
        openModal('viewUsersModal');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Render users table
function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('usersEmpty');

    if (!users || users.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        document.querySelector('#viewUsersModal .table-container').classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    document.querySelector('#viewUsersModal .table-container').classList.remove('hidden');

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${escapeHtml(user.game_name || 'Unknown')}</td>
            <td><code style="background: var(--bg-tertiary); padding: 0.25rem 0.5rem; border-radius: 4px;">${user.place_id}</code></td>
            <td>${getStatusBadge(user.whitelist_status)}</td>
            <td>
                <label class="toggle-switch">
                    <input type="checkbox" ${user.is_active ? 'checked' : ''} onchange="toggleActive('${user.place_id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </td>
            <td>
                <div class="flex gap-1">
                    ${user.whitelist_status !== 'whitelisted' ? 
                        `<button class="btn btn-sm btn-success" onclick="setWhitelistStatus('${user.place_id}', 'whitelisted')">Whitelist</button>` : 
                        `<button class="btn btn-sm btn-danger" onclick="setWhitelistStatus('${user.place_id}', 'unwhitelisted')">Unwhitelist</button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

// Handle add whitelist
async function handleAddWhitelist(e) {
    e.preventDefault();
    
    const placeId = document.getElementById('whitelistPlaceId').value;
    const gameName = document.getElementById('whitelistGameName').value;
    
    try {
        await apiRequest(`/api/whitelist/product/${currentProductId}`, {
            method: 'POST',
            body: JSON.stringify({ placeId, gameName })
        });
        
        closeModal('addWhitelistModal');
        document.getElementById('addWhitelistForm').reset();
        
        // Refresh users view
        const product = products.find(p => p.id === currentProductId);
        if (product) {
            viewUsers(currentProductId, product.name);
        }
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Set whitelist status
async function setWhitelistStatus(placeId, status) {
    try {
        // First, find or create the whitelist entry
        const whitelistData = await apiRequest(`/api/whitelist/product/${currentProductId}`);
        const entry = whitelistData.whitelist.find(w => w.place_id === placeId);
        
        if (entry) {
            await apiRequest(`/api/whitelist/${entry.id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
        } else {
            // Need to add to whitelist first
            await apiRequest(`/api/whitelist/product/${currentProductId}`, {
                method: 'POST',
                body: JSON.stringify({ placeId, gameName: 'Unknown Game' })
            });
        }
        
        // Refresh users view
        const product = products.find(p => p.id === currentProductId);
        if (product) {
            viewUsers(currentProductId, product.name);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Toggle active status
async function toggleActive(placeId, isActive) {
    try {
        const whitelistData = await apiRequest(`/api/whitelist/product/${currentProductId}`);
        const entry = whitelistData.whitelist.find(w => w.place_id === placeId);
        
        if (entry) {
            await apiRequest(`/api/whitelist/${entry.id}/toggle`, {
                method: 'PUT'
            });
        }
        
        // Refresh users view
        const product = products.find(p => p.id === currentProductId);
        if (product) {
            viewUsers(currentProductId, product.name);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
