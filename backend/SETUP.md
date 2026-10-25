# InsuraVault - Database Setup Instructions

## Problem
PostgreSQL is not installed on this machine. The backend requires PostgreSQL to store employee, attendance, task, and analytics data.

## Option 1: Install PostgreSQL on Windows

### Download
Download the PostgreSQL 18 Windows installer from:
https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

### Install
1. Run the installer as Administrator
2. During installation:
   - **Installation Directory**: Keep default (`C:\Program Files\PostgreSQL\18\`)
   - **Components**: Select "PostgreSQL Server" and "pgAdmin 4" (optional GUI)
   - **Data Directory**: Keep default
   - **Password**: Set `postgres` user password to: `localdev123`
   - **Port**: Keep default `5433` (or change .env accordingly)
   - **Locale**: Keep default

### Create the Database
After installation, open pgAdmin 4 or run in Command Prompt:

```cmd
# Connect as postgres user
psql -U postgres -h localhost -p 5433

# Create the insurance database
CREATE DATABASE insurance;

# Exit
\q
```

### Verify Connection
```cmd
psql -U postgres -h localhost -p 5433 -d insurance -c "SELECT 1;"
```

## Option 2: Use Docker (if available)

```bash
docker run --name insurance-db \
  -e POSTGRES_PASSWORD=localdev123 \
  -e POSTGRES_DB=insurance \
  -p 5433:5432 \
  -d postgres:18
```

## Verify the Setup

Once PostgreSQL is running, restart the backend:

```cmd
# Stop existing node processes
taskkill /F /IM node.exe

# Start backend
cd backend
node src/index.js
```

Then verify:
```cmd
curl http://localhost:5000/api/health
```

Should return `"database": "connected"`.

## Login Credentials

After database setup, the following accounts are auto-created:

| Role | Email | Password |
|------|-------|----------|
| System Admin | system@insuravault.com | sysadmin123 |
| Company Admin | admin@insurance.com | admin123 |

## Current Status

- ✅ Frontend: Running at `http://localhost:3000`
- ✅ Backend API: Running at `http://localhost:5000/api`
- ❌ PostgreSQL: Not installed (required for full functionality)

Without PostgreSQL, the frontend loads but login and all data-dependent features will not work because there is no database to authenticate against or store records.
