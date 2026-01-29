// auth.js - Common Authentication Functions

const API_URL = '';

// Get auth token
function getToken() {
    return localStorage.getItem('token');
}

// Get current user
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Check if authenticated
async function checkAuth() {
    const token = getToken();
    
    if (!token) {
        // Not logged in
        if (window.location.pathname === '/panel') {
            window.location.href = '/login';
        }
        return null;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect to panel if on auth pages
            if (window.location.pathname === '/login' || window.location.pathname === '/register') {
                window.location.href = '/panel';
            }
            
            return data.user;
        } else {
            // Token invalid
            logout();
            return null;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        defaultHeaders['Authorization'] = 'Bearer ' + token;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    const response = await fetch(endpoint, config);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    
    return data;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format relative time
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusMap = {
        'whitelisted': { class: 'status-whitelisted', text: 'Whitelisted' },
        'unwhitelisted': { class: 'status-unwhitelisted', text: 'Unwhitelisted' },
        'pending': { class: 'status-pending', text: 'Pending' },
        'notyetcheck': { class: 'status-notyetcheck', text: 'Not Yet Checked' }
    };
    
    const info = statusMap[status] || statusMap['pending'];
    return `<span class="status-badge ${info.class}">${info.text}</span>`;
}
