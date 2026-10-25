# Insurance Management System - Technical Specification

## Project Overview
- **Project Name**: Insurance Management System (IMS)
- **Type**: Full-stack Web Application
- **Core Functionality**: Comprehensive insurance policy management with three distinct user portals
- **Target Users**: Insurance customers, administrators, and service providers

## System Architecture

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (production-ready)
- **Authentication**: JWT with refresh tokens
- **Frontend**: React.js with modern UI components
- **File Storage**: Local file system with proper organization
- **Password Hashing**: bcrypt

### Three Portal Architecture
1. **Customer Portal** - Policy purchase, claims, document upload
2. **Admin Panel** - Full system management and oversight
3. **Service Provider Dashboard** - Customer care and inquiry management

## Database Schema

### Users Table
- id (UUID, PK)
- email (VARCHAR, unique)
- password_hash (VARCHAR)
- role (ENUM: 'customer', 'admin', 'provider')
- phone (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Customer Details Table
- id (UUID, PK)
- user_id (UUID, FK)
- full_name (VARCHAR)
- id_number (VARCHAR, unique)
- phone (VARCHAR)
- email (VARCHAR)
- address (TEXT)
- date_of_birth (DATE)
- is_verified (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Insurance Plans Table
- id (UUID, PK)
- name (VARCHAR)
- description (TEXT)
- coverage_amount (DECIMAL)
- premium_amount (DECIMAL)
- duration_months (INTEGER)
- features (JSONB)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Policies Table
- id (UUID, PK)
- customer_id (UUID, FK)
- plan_id (UUID, FK)
- policy_number (VARCHAR, unique)
- status (ENUM: 'pending', 'approved', 'active', 'cancelled', 'expired')
- start_date (DATE)
- end_date (DATE)
- premium_amount (DECIMAL)
- coverage_amount (DECIMAL)
- documents (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Claims Table
- id (UUID, PK)
- policy_id (UUID, FK)
- customer_id (UUID, FK)
- claim_number (VARCHAR, unique)
- claim_type (VARCHAR)
- amount_claimed (DECIMAL)
- status (ENUM: 'pending', 'under_review', 'approved', 'rejected', 'paid')
- description (TEXT)
- documents (JSONB)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Payments Table
- id (UUID, PK)
- customer_id (UUID, FK)
- policy_id (UUID, FK)
- amount (DECIMAL)
- payment_method (VARCHAR)
- transaction_id (VARCHAR)
- status (ENUM: 'pending', 'completed', 'failed', 'refunded')
- payment_date (TIMESTAMP)
- created_at (TIMESTAMP)

### Tickets Table
- id (UUID, PK)
- customer_id (UUID, FK)
- assigned_provider_id (UUID, FK)
- subject (VARCHAR)
- description (TEXT)
- status (ENUM: 'open', 'in_progress', 'resolved', 'escalated', 'closed')
- priority (ENUM: 'low', 'medium', 'high', 'urgent')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Ticket Responses Table
- id (UUID, PK)
- ticket_id (UUID, FK)
- user_id (UUID, FK)
- response (TEXT)
- created_at (TIMESTAMP)

### Audit Logs Table
- id (UUID, PK)
- user_id (UUID, FK)
- action (VARCHAR)
- entity_type (VARCHAR)
- entity_id (UUID)
- details (JSONB)
- ip_address (VARCHAR)
- created_at (TIMESTAMP)

### Notifications Table
- id (UUID, PK)
- user_id (UUID, FK)
- type (ENUM: 'email', 'sms', 'in_app')
- title (VARCHAR)
- message (TEXT)
- is_read (BOOLEAN)
- created_at (TIMESTAMP)

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh-token
- POST /api/auth/logout

### Customers
- GET /api/customers
- GET /api/customers/:id
- PUT /api/customers/:id
- POST /api/customers/check-existence

### Insurance Plans
- GET /api/plans
- GET /api/plans/:id
- POST /api/plans
- PUT /api/plans/:id
- DELETE /api/plans/:id

### Policies
- GET /api/policies
- GET /api/policies/:id
- POST /api/policies
- PUT /api/policies/:id/status
- DELETE /api/policies/:id

### Claims
- GET /api/claims
- GET /api/claims/:id
- POST /api/claims
- PUT /api/claims/:id/status
- DELETE /api/claims/:id

### Payments
- GET /api/payments
- POST /api/payments

### Tickets
- GET /api/tickets
- GET /api/tickets/:id
- POST /api/tickets
- PUT /api/tickets/:id
- POST /api/tickets/:id/respond
- POST /api/tickets/:id/escalate

### Dashboard & Reports
- GET /api/dashboard/stats
- GET /api/reports/customers
- GET /api/reports/policies
- GET /api/reports/claims

## UI/UX Design Requirements

### Color Palette
- Primary: #1E3A5F (Deep Navy Blue)
- Secondary: #3498DB (Sky Blue)
- Accent: #27AE60 (Emerald Green)
- Warning: #F39C12 (Orange)
- Danger: #E74C3C (Red)
- Background: #F8F9FA (Light Gray)
- Card Background: #FFFFFF
- Text Primary: #2C3E50
- Text Secondary: #7F8C8D

### Typography
- Primary Font: 'Inter', sans-serif
- Headings: 'Poppins', sans-serif
- Font Sizes: 
  - H1: 32px
  - H2: 24px
  - H3: 20px
  - Body: 16px
  - Small: 14px

### Layout
- Sidebar Navigation (collapsible)
- Responsive Design
- Card-based content display
- Modal-based forms
- Toast notifications

## Security Requirements
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- Rate limiting on auth endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers
- SQL injection prevention (parameterized queries)

## Acceptance Criteria
1. Customer can register with email verification flow
2. Customer can check existence by ID/phone and confirm details
3. Customer can view and apply for policies
4. Customer can submit and track claims
5. Admin can manage all aspects of the system
6. Service provider can handle customer inquiries
7. All endpoints are properly authenticated
8. Role-based access control works correctly
9. Audit logs capture all important actions
10. System generates reports in PDF/CSV format
