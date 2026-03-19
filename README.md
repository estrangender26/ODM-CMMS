# ODM-CMMS

**Operator-Driven Maintenance Computerized Maintenance Management System**

A mobile-first CMMS application built with Node.js, Express, and MySQL.

## Quick Start (Windows)

The easiest way to get started on Windows is using the provided installer scripts.

### Prerequisites
1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **MySQL 8.0+** - Download from [mysql.com](https://dev.mysql.com/downloads/installer/)

### Installation Steps

#### Option 1: Automatic Installer (Recommended)

1. **Double-click `install-windows.bat`**
   - The script will check prerequisites
   - Install dependencies
   - Configure the database
   - Start the server

2. **Open browser and go to:** http://localhost:3000

3. **Login with:**
   - **Admin:** `admin` / `admin123`
   - **Operator:** `operator1` / `operator123`

#### Option 2: Manual Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env
# Edit .env with your MySQL credentials

# 3. Initialize database
npm run db:init

# 4. Start server
npm run dev
```

### Available Scripts

| Script | Purpose |
|--------|---------|
| `install-windows.bat` | First-time setup - installs everything |
| `start-server.bat` | Start the server (after installation) |
| `reset-database.bat` | Reset database to default state |
| `update.bat` | Update dependencies |

## Features

### For Operators
- Login with secure JWT authentication
- View assigned work orders
- Input inspection readings (numeric, boolean, text, select)
- Submit completed work orders
- Mobile-optimized interface

### For Admins
- Manage equipment and assets
- Create and manage task templates
- Schedule preventive maintenance
- Create and assign work orders
- View reports and analytics

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** MySQL 8.0+
- **Frontend:** EJS, Vanilla JavaScript (Mobile-first CSS)
- **Authentication:** JWT with bcrypt
- **PWA:** Service Worker, Web Manifest

## Database Schema

### Tables
- `users` - User accounts and authentication
- `facilities` - Physical locations/facilities
- `equipment` - Assets and equipment
- `task_master` - Task templates/checklists
- `schedules` - Preventive maintenance schedules
- `work_orders` - Work order tracking
- `inspection_points` - Individual inspection checkpoints
- `inspection_readings` - Actual readings from operators
- `attachments` - File uploads
- `audit_log` - Change tracking

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/register` - Register new user (admin only)

### Equipment
- `GET /api/equipment` - List all equipment
- `GET /api/equipment/:id` - Get equipment details
- `POST /api/equipment` - Create equipment (admin)
- `PUT /api/equipment/:id` - Update equipment (admin)
- `DELETE /api/equipment/:id` - Delete equipment (admin)

### Work Orders
- `GET /api/work-orders` - List work orders
- `GET /api/work-orders/my-work-orders` - Get operator's work orders
- `GET /api/work-orders/:id` - Get work order details
- `POST /api/work-orders` - Create work order (admin)
- `PUT /api/work-orders/:id/status` - Update status
- `POST /api/work-orders/:id/notes` - Add note

### Inspections
- `GET /api/inspections/points/task/:taskId` - Get inspection points
- `GET /api/inspections/readings/work-order/:workOrderId` - Get readings
- `POST /api/inspections/readings/work-order/:workOrderId` - Submit reading
- `POST /api/inspections/readings/work-order/:workOrderId/bulk` - Submit multiple

## Mobile Features

- **Progressive Web App:** Install on home screen
- **Offline Support:** Cached pages work offline
- **Pull to Refresh:** Swipe down to refresh data
- **Touch Optimized:** Large touch targets, smooth animations
- **Responsive Design:** Works on all screen sizes

## Troubleshooting

### "mysql command not found"
Add MySQL to your PATH:
- Default location: `C:\Program Files\MySQL\MySQL Server 8.0\bin`

### "Port 3000 already in use"
Edit `.env` file:
```env
PORT=3001
```

### "Access denied for user"
Check your MySQL credentials in `.env` file.

### Reset Everything
Run `reset-database.bat` to restore default data.

## Development

### Available npm Scripts
- `npm start` - Start production server
- `npm run dev` - Start with auto-reload
- `npm test` - Run tests
- `npm run db:init` - Initialize database

### Project Structure
```
ODM-CMMS/
├── database/
│   └── schema.sql          # Database schema
├── src/
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Express middleware
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── app.js              # Express app setup
│   └── index.js            # Server entry point
├── public/                 # Static assets
├── views/                  # EJS templates
├── install-windows.bat     # Windows installer
├── start-server.bat        # Start server script
├── reset-database.bat      # Reset database script
├── .env.example            # Environment template
└── package.json
```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for cloud hosting options.

## License

MIT
