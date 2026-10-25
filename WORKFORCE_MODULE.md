# InsuraVault Workforce Management & Performance Analytics Module

## Overview

The Workforce Management module integrates into the existing InsuraVault Insurance Management System to provide:

- **Employee Management** - CRUD, search, filters, pagination, deactivation/archival
- **Attendance System** - Clock-in/out, break management, adjustments, audit trail
- **Task Management** - Full lifecycle (create → assign → start → submit → review → approve/reject)
- **Performance Analytics** - Staff, department, and company-level metrics
- **Monthly Performance Comparison** - 12-month trend analysis with comparison tables
- **Reports** - PDF and CSV monthly report generation
- **Notifications** - Audit-log based notification center
- **Leave Requests** - Submit, approve, reject workflow

## Technology Stack

- **Backend**: Node.js, Express.js, PostgreSQL (existing IMS stack)
- **Frontend**: React.js (existing IMS stack)
- **Database**: PostgreSQL (existing, extended with workforce tables)
- **Authentication**: JWT (existing, reused - no duplicate auth system)

## Database Schema (New Tables)

All tables added to the existing `insurance` database via `initDb.js`:

| Table | Purpose |
|-------|---------|
| `departments` | Department records with managers and targets |
| `employees` | Staff records linked to users |
| `work_schedules` | Employee shift schedules by weekday |
| `attendance_records` | Clock-in/out sessions with net work hours |
| `attendance_breaks` | Break records (lunch, tea, personal, other) |
| `attendance_adjustments` | Correction requests with approval workflow |
| `leave_requests` | Leave applications with approval status |
| `tasks` | Work assignments with categories and priorities |
| `task_assignments` | Employee-to-task assignments |
| `task_updates` | Status change history |
| `task_submissions` | Work submissions for review |
| `task_reviews` | Review decisions with quality scores |
| `performance_targets` | Configurable monthly targets |
| `monthly_performance_snapshots` | Periodic performance snapshots |

## Backend API Endpoints

### Employees
- `GET /api/employees` - List with search/filter/pagination (HR+)
- `GET /api/employees/:id` - Get by ID (Manager+)
- `POST /api/employees` - Create (HR+)
- `PATCH /api/employees/:id` - Update (HR+)
- `DELETE /api/employees/:id` - Deactivate/delete (HR+)
- `GET /api/employees/:id/performance` - Performance metrics (Supervisor+)

### Attendance
- `POST /api/attendance/clock-in` - Clock in (Employee)
- `POST /api/attendance/clock-out` - Clock out (Employee)
- `POST /api/attendance/breaks/start` - Start break (Employee)
- `POST /api/attendance/breaks/end` - End break (Employee)
- `GET /api/attendance/me` - My attendance (Employee)
- `GET /api/attendance` - List all (Supervisor+)
- `GET /api/attendance/summary` - Dashboard metrics (Manager+)
- `POST /api/attendance/adjustments` - Request correction (Employee)
- `PATCH /api/attendance/adjustments/:id/review` - Approve/reject (HR+)

### Tasks
- `GET /api/tasks` - List with filters (Employee+)
- `POST /api/tasks` - Create (Manager+)
- `GET /api/tasks/:id` - Get with assignments/reviews (Employee+)
- `PATCH /api/tasks/:id` - Update (Manager+)
- `DELETE /api/tasks/:id` - Delete (Manager+)
- `POST /api/tasks/:id/assign` - Assign employees (Manager+)
- `POST /api/tasks/:id/start` - Start work (Employee)
- `POST /api/tasks/:id/submit` - Submit for review (Employee)
- `POST /api/tasks/:id/review` - Approve/reject (Supervisor+)
- `GET /api/tasks/summary` - Task metrics (Employee+)

### Analytics
- `GET /api/analytics/staff` - Staff performance (Supervisor+)
- `GET /api/analytics/departments` - Department comparison (Manager+)
- `GET /api/analytics/company` - Company KPIs (HR+)
- `GET /api/analytics/monthly` - 12-month comparison (HR+)
- `GET /api/analytics/attendance` - Attendance analytics (Manager+)
- `GET /api/analytics/productivity` - Productivity metrics (Manager+)
- `GET /api/analytics/targets` - Performance targets (Manager+)
- `GET /api/analytics/insights` - AI-style insights (HR+)

### Reports
- `GET /api/reports/monthly?year=&month=&format=pdf\|csv` - Monthly report (HR+)

### Leave Requests
- `GET /api/leave-requests` - List (Manager+)
- `POST /api/leave-requests` - Submit (Employee)
- `PATCH /api/leave-requests/:id/approve` - Approve/reject (HR+)

## Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| **Super Admin / Admin** | Full system access including workforce module |
| **HR Manager** | Employee management, attendance oversight, reports, leave approval |
| **Department Manager** | Department analytics, task management, attendance summary |
| **Supervisor** | Task review, staff performance, attendance list |
| **Employee** | Clock-in/out, breaks, own attendance, task lifecycle, leave requests |

All permissions enforced server-side. Frontend UI hides unauthorized items but backend is the authority.

## Frontend Routes

| Route | Component | Required Role |
|-------|-----------|--------------|
| `/workforce/employees` | WorkforceEmployees | HR+ |
| `/workforce/attendance` | WorkforceAttendance | Employee+ |
| `/workforce/tasks` | WorkforceTasks | Employee+ |
| `/workforce/performance` | WorkforcePerformance | Supervisor+ |
| `/workforce/monthly` | WorkforceMonthly | HR+ |
| `/workforce/reports` | WorkforceReports | HR+ |
| `/workforce/notifications` | WorkforceNotifications | Employee+ |
| `/workforce/leave-requests` | WorkforceLeaveRequests | Employee+ |

## Setup

### Backend
1. Ensure PostgreSQL is running on `localhost:5433` with database `insurance`
2. Configure `.env` with `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
3. Start: `cd backend && node src/index.js`
4. Database auto-initializes on startup (creates workforce tables + default departments)

### Frontend
1. Start: `cd frontend && npm start` (dev) or `npm run build` (production)
2. API URL auto-resolves to `http://localhost:5000/api` in development

## Default Credentials

- **Admin**: `admin@insurance.com` / `admin123` (role: admin)

## Environment Variables

```
DB_HOST=localhost
DB_PORT=5433
DB_NAME=insurance
DB_USER=postgres
DB_PASSWORD=localdev123
DB_SSL=false

JWT_SECRET=change_me_to_a_secure_random_value
JWT_REFRESH_SECRET=change_me_to_a_secure_random_value
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

PORT=5000
NODE_ENV=development
```

## Integration Notes

- Reuses existing IMS authentication (JWT + refresh tokens)
- Reuses existing `audit_logs` table for workforce audit trail
- Reuses existing `users` table - workforce employees link via `user_id`
- No duplicate authentication or employee tables created
- Existing IMS features (customers, policies, claims, payments, tickets) remain operational
