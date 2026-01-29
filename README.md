# RoLicense - Roblox Licensing Platform

A complete licensing system for Roblox developers to track and manage who uses their assets/scripts.

## Features

- 🔐 **User Authentication** - Register/Login system with JWT tokens
- 📦 **Product Management** - Create and manage multiple products
- 📊 **Usage Analytics** - Track who uses your products and from which games
- 🛡️ **Whitelist System** - Control which Place IDs can use your products
- 📜 **Auto Script Generation** - Get ready-to-use Roblox scripts
- 🎮 **Game Tracking** - See all games using your products with status indicators

## Status Indicators

| Color | Status | Description |
|-------|--------|-------------|
| 🟠 Orange | Pending | Not yet checked - allowed by default |
| 🟢 Green | Whitelisted | Explicitly allowed to use |
| 🔴 Red | Unwhitelisted | Blocked from using |

## Requirements

- Node.js 18.0.0 or higher
- npm or yarn

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/roblox-license-platform.git
cd roblox-license-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit `.env` to set your own JWT secret:

```env
PORT=3000
JWT_SECRET=your-secure-random-secret-key
NODE_ENV=development
```

> **Note:** If you don't create a `.env` file, the app will use default values. For production, you should always set a secure `JWT_SECRET`.

### 4. Start the Server

```bash
# Development mode (auto-reload on file changes)
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:3000`

### 3. Access the Platform

- **Home Page**: http://localhost:3000
- **Register**: http://localhost:3000/register
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/panel

## Using the Platform

### Creating a Product

1. Login to your account
2. Go to the **Products** tab
3. Click **+ Add Product**
4. Enter the product name and description
5. A Roblox script will be automatically generated

### Setting Up in Roblox

1. Copy the generated script from the dashboard
2. Open your Roblox game in Studio
3. Go to **Game Settings > Security**
4. Enable **Allow HTTP Requests**
5. Create a new **Script** in **ServerScriptService**
6. Paste the generated script
7. Publish and run your game

### Managing Whitelists

1. Go to the **Products** tab
2. Click **View Users** on a product
3. You'll see all games that have used your product
4. Click **Whitelist** to allow a game
5. Click **Unwhitelist** to block a game
6. Use the toggle to turn access ON/OFF

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get single product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/:id/users` - Get product users
- `GET /api/products/:id/script` - Get Roblox script

### Whitelist
- `GET /api/whitelist/product/:productId` - Get whitelist
- `POST /api/whitelist/product/:productId` - Add to whitelist
- `PUT /api/whitelist/:id/status` - Update status
- `PUT /api/whitelist/:id/toggle` - Toggle active state
- `DELETE /api/whitelist/:id` - Remove from whitelist

### Tracking (Called by Roblox)
- `POST /api/track/verify` - Verify license (Roblox endpoint)
- `GET /api/track/ping` - Health check
- `GET /api/track/stats/:productKey` - Get product stats

## Deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | Secret key for JWT tokens | (default insecure key) |
| `NODE_ENV` | Environment mode | `development` |

### Deploy to Railway

1. Push your code to GitHub
2. Connect your GitHub repo to [Railway](https://railway.app)
3. Set environment variables in Railway dashboard
4. Deploy!

### Deploy to Render

1. Push your code to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repo
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables
7. Deploy!

### Deploy to VPS (Ubuntu/Debian)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/roblox-license-platform.git
cd roblox-license-platform

# Install dependencies
npm install

# Set environment variables
export JWT_SECRET=your-secure-secret-key
export PORT=3000
export NODE_ENV=production

# Use PM2 for process management
npm install -g pm2
pm2 start server.js --name roblox-license

# Setup nginx reverse proxy with SSL (recommended)
```

### Important Security Notes

- **Always change `JWT_SECRET`** in production - generate a secure key using:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- Use HTTPS in production (SSL certificate)
- The SQLite database file (`database.sqlite`) is created automatically and contains all data - back it up regularly
- Consider using PostgreSQL or MySQL for high-traffic production environments

## File Structure

```
roblox-license-platform/
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies and scripts
├── server.js             # Main server entry point
├── database.js           # SQLite database setup
├── README.md             # This file
├── middleware/
│   └── auth.js           # JWT authentication middleware
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── products.js       # Product management routes
│   ├── whitelist.js      # Whitelist management routes
│   └── tracking.js       # Roblox tracking routes
├── public/
│   ├── index.html        # Landing page
│   ├── login.html        # Login page
│   ├── register.html     # Registration page
│   ├── panel.html        # Dashboard
│   ├── css/
│   │   └── style.css     # Styles
│   └── js/
│       ├── auth.js       # Auth utilities
│       └── panel.js      # Dashboard functionality
└── roblox/
    └── LicenseScript.lua # Template Roblox script
```

## Troubleshooting

### "HTTP Request failed" in Roblox
- Make sure HTTP Requests are enabled in Game Settings
- Check that your server URL is correct and accessible
- Ensure your server is running and has SSL (HTTPS)

### "Invalid product key"
- The product key must match exactly what's in your database
- Copy the script again from the dashboard

### Users not showing up
- The tracking system logs every request
- Make sure the Roblox script is running
- Check server logs for any errors

## License

MIT License - Feel free to modify and use for your projects!

---

Made with ❤️ for Roblox Developers
