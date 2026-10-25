# Insurance Management System

A comprehensive full-stack Insurance Management System with three distinct user portals: Admin Panel, Customer Portal, and Service Provider Dashboard.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Insurance Management System                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Customer   │  │     Admin    │  │   Service    │     │
│  │   Portal     │  │    Panel     │  │  Provider    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                     ┌──────▼───────┐                       │
│                     │   REST API   │                       │
│                     │   (Express)  │                       │
│                     └──────┬───────┘                       │
│                            │                                 │
│                     ┌──────▼───────┐                       │
│                     │  PostgreSQL  │                       │
│                     │  Database    │                       │
│                     └─────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Customer Portal
- Customer registration with ID/phone verification
- View available insurance policies
- Apply for policies
- Upload required documents
- Track policy status
- Submit and track claims
- View payment history

### Admin Panel
- Secure admin login
- Dashboard with statistics
- Manage customers (view, update, deactivate)
- Approve/reject policies
- Approve/reject claims
- Manage insurance plans (CRUD)
- Generate reports (PDF/CSV export)

### Service Provider Dashboard
- Secure login
- View assigned customer inquiries
- Access customer profiles (read-only)
- Respond to customer tickets
- Update claim progress status
- Escalate cases to admin

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with refresh tokens
- **Frontend**: React.js
- **Security**: bcrypt, Helmet.js, Rate limiting

## Database Schema (ER Diagram)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │customer_    │       │insurance_   │
│             │       │details      │       │plans        │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄─────│ user_id(FK) │       │ id (PK)     │
│ email       │       │ id (PK)     │       │ name        │
│ password    │       │ full_name   │       │ description │
│ role        │       │ id_number   │       │ coverage    │
│ phone       │       │ phone       │       │ premium     │
│ is_active   │       │ address     │       │ duration    │
│ created_at  │       │ dob         │       │ features    │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │                      │                      │
       │              ┌──────▼──────┐               │
       │              │  policies   │               │
       │              ├─────────────┤               │
       └─────────────│ customer_id │               │
              ┌─────│ plan_id(FK) │◄──────────────┘
              │     │ policy_num  │
              │     │ status      │
              │     │ start_date  │
              │     │ end_date    │
              │     └──────┬──────┘
              │            │
       ┌──────▼──────┐    │     ┌─────────────┐
       │   claims    │◄───┘     │  payments   │
       ├─────────────┤          ├─────────────┤
       │ policy_id   │          │ policy_id   │
       │ customer_id │          │ customer_id  │
       │ claim_num   │          │ amount      │
       │ amount      │          │ status      │
       │ status      │          └─────────────┘
       │ description │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │   tickets   │
       ├─────────────┤
       │ customer_id │
       │ subject     │
       │ status      │
       │ priority    │
       └─────────────┘
```

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

### 1. Clone the Repository

```
bash
cd insurance-management-system
```

### 2. Backend Setup

```
bash
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the backend directory:

```
env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=insurance_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=your_refresh_token_secret_change_in_production
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 4. Initialize Database

```
bash
npm run db:init
```

This will create all necessary tables and insert sample data including:
- Default admin user (email: admin@insurance.com, password: admin123)
- Sample insurance plans

### 5. Start Backend Server

```
bash
npm start
```

The server will run on http://localhost:5000

### 6. Frontend Setup

```
bash
cd ../frontend
npm install
npm start
```

The frontend will run on http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/check-existence` - Check if customer exists
- `POST /api/auth/confirm-details` - Confirm customer details

### Customers
- `GET /api/customers/profile` - Get current customer profile
- `PUT /api/customers/profile` - Update customer profile
- `GET /api/customers/dashboard` - Get customer dashboard

### Plans
- `GET /api/plans` - Get all insurance plans
- `GET /api/plans/:id` - Get plan by ID
- `POST /api/plans` - Create plan (admin)
- `PUT /api/plans/:id` - Update plan (admin)
- `DELETE /api/plans/:id` - Delete plan (admin)

### Policies
- `GET /api/policies` - Get all policies
- `GET /api/policies/:id` - Get policy by ID
- `POST /api/policies` - Apply for policy
- `PUT /api/policies/:id/status` - Update policy status

### Claims
- `GET /api/claims` - Get all claims
- `GET /api/claims/:id` - Get claim by ID
- `POST /api/claims` - Submit claim
- `PUT /api/claims/:id/status` - Update claim status

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Process payment
- `GET /api/payments/history` - Get payment history

### Tickets
- `GET /api/tickets` - Get all tickets
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create ticket
- `POST /api/tickets/:id/respond` - Respond to ticket
- `POST /api/tickets/:id/escalate` - Escalate ticket

### Dashboard & Reports
- `GET /api/dashboard/stats` - Get admin statistics
- `GET /api/dashboard/provider` - Get provider dashboard
- `GET /api/reports/pdf/:type` - Generate PDF report
- `GET /api/reports/csv/:type` - Generate CSV report

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@insurance.com | admin123 |

## Project Structure

```
insurance-management-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          # Database connection
│   │   │   └── initDb.js      # Database initialization
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Auth & validation middleware
│   │   ├── routes/            # API routes
│   │   ├── services/           # Email & SMS services
│   │   └── index.js           # Main server file
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   ├── index.js           # React entry point
│   │   └── index.css         # Global styles
│   └── package.json
├── SPEC.md                     # Technical specification
└── README.md                  # This file
```

## Security Features

- JWT authentication with access and refresh tokens
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Rate limiting on auth endpoints
- SQL injection prevention
- CORS configuration
- Helmet.js security headers

## License

MIT License
