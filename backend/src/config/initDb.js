const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../../.env' });

/**
 * Build the connection config from the environment (backend/.env).
 * DATABASE_URL wins when present; otherwise fall back to the DB_* variables.
 */
const buildConfig = (databaseOverride) => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    database: databaseOverride || process.env.DB_NAME,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'localdev123',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
};

const targetDb = process.env.DB_NAME || 'insurance';

// Connect straight to the target database. Managed providers (Render, Heroku,
// Neon, ...) do not grant CREATE DATABASE, so we do not attempt it here.
const pool = new Pool(buildConfig());

/**
 * Initialize Database Schema
 * Creates all necessary tables for the Insurance Management System.
 * Gracefully degrades when PostgreSQL is not available.
 */
const initializeDatabase = async () => {
  console.log('🚀 Starting database initialization...');

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to target database:', targetDb);
  } catch (err) {
    console.error('❌ Could not connect to PostgreSQL:', err.message);
    console.error(
      '   → PostgreSQL is not installed or not running on port 5433.\n' +
      '     Install PostgreSQL and create the `insurance` database.\n' +
      '     See backend/README.md for setup instructions.\n' +
      '     The server will start but database endpoints will return empty results.'
    );
    return false;
  }

  try {
    // Create ENUM types
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('customer', 'admin', 'provider', 'system_admin', 'company_admin', 'hr_manager', 'department_manager', 'supervisor', 'employee', 'senior_management');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `).catch(e => console.log('user_role:', e.message));

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'system_admin' AND enumtypid = 'user_role'::regtype) THEN
          ALTER TYPE user_role ADD VALUE 'system_admin';
        END IF;
      END
      $$;
    `).catch(e => console.log('user_role add system_admin:', e.message));
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'company_admin' AND enumtypid = 'user_role'::regtype) THEN
          ALTER TYPE user_role ADD VALUE 'company_admin';
        END IF;
      END
      $$;
    `).catch(e => console.log('user_role add company_admin:', e.message));

    // ========================================================================

    // ========================================================================
    // MULTI-TENANCY: Companies Table
    // ========================================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255),
        registration_number VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        website VARCHAR(255),
        logo_url TEXT,
        subscription_plan VARCHAR(50) DEFAULT 'basic',
        subscription_status VARCHAR(20) DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Companies table created');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'customer',
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // Insurance plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS insurance_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        coverage_amount NUMERIC(15,2) NOT NULL,
        premium_amount NUMERIC(15,2) NOT NULL,
        duration_months INTEGER NOT NULL DEFAULT 12,
        features JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (name)
      );
    `);
    console.log('✅ Insurance plans table created');

    // Customer details table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_details (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        id_number VARCHAR(50),
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        date_of_birth DATE,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Customer details table created');

    // Policies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID REFERENCES insurance_plans(id) ON DELETE SET NULL,
        policy_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        start_date DATE,
        end_date DATE,
        premium_amount NUMERIC(15,2),
        coverage_amount NUMERIC(15,2),
        documents JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Policies table created');

    // Claims table
    await client.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
        customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        claim_number VARCHAR(50) UNIQUE NOT NULL,
        claim_type VARCHAR(50),
        amount_claimed NUMERIC(15,2),
        description TEXT,
        documents JSONB DEFAULT '[]',
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Claims table created');

    // Payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
        amount NUMERIC(15,2) NOT NULL,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'completed',
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Payments table created');

    // Tickets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        assigned_provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tickets table created');

    // Ticket responses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Ticket responses table created');

    // Audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Audit logs table created');

    // Indexes for core tables
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customer_details_user_id ON customer_details(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_customer_id ON policies(customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_plan_id ON policies(plan_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_claims_customer_id ON claims(customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_policy_id ON payments(policy_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);`);
    console.log('✅ Core table indexes created');

    // Create Users Table with company_id for multi-tenancy
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'customer',
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // ========================================================================
    // DEFAULT COMPANY + SYSTEM ADMIN + COMPANY ADMIN
    // ========================================================================

    // Create default company
    await client.query(`
      INSERT INTO companies (name, legal_name, email, phone, subscription_plan, subscription_status, is_active)
      VALUES ('InsuraVault Insurance Co.', 'InsuraVault Insurance Company Ltd', 'admin@insuravault.com', '+1234567890', 'enterprise', 'active', true)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Default company created');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@insurance.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);

    const sysAdminEmail = process.env.SYSADMIN_EMAIL || 'system@insuravault.com';
    const sysAdminPassword = process.env.SYSADMIN_PASSWORD || 'sysadmin123';
    const sysAdminPasswordHash = bcrypt.hashSync(sysAdminPassword, 10);

    // Get default company ID
    const companyResult = await client.query("SELECT id FROM companies WHERE name = 'InsuraVault Insurance Co.' LIMIT 1");
    const defaultCompanyId = companyResult.rows[0]?.id;

    // Upsert system admin (no company_id - can access all companies)
    await client.query(
      `INSERT INTO users (email, password_hash, role, phone, is_active)
       VALUES ($1, $2, 'system_admin', '+0000000000', true)
       ON CONFLICT (email)
       DO UPDATE SET role = 'system_admin', is_active = true, updated_at = CURRENT_TIMESTAMP`,
      [sysAdminEmail, sysAdminPasswordHash]
    );
    console.log(`✅ System admin user ready (email: ${sysAdminEmail}, password: ${sysAdminPassword})`);

    // Upsert company admin (scoped to default company)
    await client.query(
      `INSERT INTO users (company_id, email, password_hash, role, phone, is_active)
       VALUES ($1, $2, $3, 'company_admin', '+1234567890', true)
       ON CONFLICT (email)
       DO UPDATE SET company_id = EXCLUDED.company_id, role = 'company_admin', is_active = true, updated_at = CURRENT_TIMESTAMP`,
      [defaultCompanyId, adminEmail, adminPasswordHash]
    );
    console.log(`✅ Company admin user ready (email: ${adminEmail}, password: ${adminPassword})`);

    // ========================================================================
    // WORKFORCE MANAGEMENT TABLES
    // ========================================================================

    // Departments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        monthly_target INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Departments table created');

    // Employees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        employee_number VARCHAR(50) UNIQUE NOT NULL,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
        job_title VARCHAR(100),
        employment_status VARCHAR(20) DEFAULT 'active',
        start_date DATE,
        timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
        contracted_hours INTEGER DEFAULT 40,
        monthly_performance_target INTEGER DEFAULT 0,
        profile_photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Employees table created');

    // Work schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
        shift_start TIME,
        shift_end TIME,
        break_policy JSONB DEFAULT '[]',
        effective_from DATE DEFAULT CURRENT_DATE,
        effective_to DATE,
        timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Work schedules table created');

    // Attendance records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        scheduled_shift_id UUID REFERENCES work_schedules(id) ON DELETE SET NULL,
        clock_in_at TIMESTAMP,
        clock_out_at TIMESTAMP,
        attendance_status VARCHAR(20) DEFAULT 'not_clocked_in',
        total_elapsed_seconds INTEGER DEFAULT 0,
        unpaid_break_seconds INTEGER DEFAULT 0,
        net_work_seconds INTEGER DEFAULT 0,
        late_seconds INTEGER DEFAULT 0,
        overtime_seconds INTEGER DEFAULT 0,
        source VARCHAR(20) DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Attendance records table created');

    // Attendance breaks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_breaks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
        break_type VARCHAR(20) NOT NULL,
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP,
        paid_status BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Attendance breaks table created');

    // Attendance adjustments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_adjustments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        original_values JSONB DEFAULT '{}',
        proposed_values JSONB DEFAULT '{}',
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP
      );
    `);
    console.log('✅ Attendance adjustments table created');

    // Leave requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type VARCHAR(20) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        approval_status VARCHAR(20) DEFAULT 'pending',
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Leave requests table created');

    // Tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_number VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        task_category VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        complexity_level INTEGER DEFAULT 1 CHECK (complexity_level >= 1 AND complexity_level <= 5),
        estimated_effort_minutes INTEGER DEFAULT 60,
        start_at TIMESTAMP,
        due_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'draft',
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tasks table created');

    // Task assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        assignment_status VARCHAR(20) DEFAULT 'active'
      );
    `);
    console.log('✅ Task assignments table created');

    // Task updates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
        old_status VARCHAR(20),
        new_status VARCHAR(20),
        progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Task updates table created');

    // Task submissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        submission_notes TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        review_status VARCHAR(20) DEFAULT 'pending'
      );
    `);
    console.log('✅ Task submissions table created');

    // Task reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        review_decision VARCHAR(20) NOT NULL,
        quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
        feedback TEXT,
        reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Task reviews table created');

    // Performance targets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS performance_targets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
        target_type VARCHAR(50) NOT NULL,
        target_value NUMERIC NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE NOT NULL,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Performance targets table created');

    // Monthly performance snapshots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_performance_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporting_year INTEGER NOT NULL,
        reporting_month INTEGER NOT NULL CHECK (reporting_month >= 1 AND reporting_month <= 12),
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
        tasks_due INTEGER DEFAULT 0,
        verified_completed_tasks INTEGER DEFAULT 0,
        completion_rate NUMERIC DEFAULT 0,
        on_time_completion_rate NUMERIC DEFAULT 0,
        attendance_rate NUMERIC DEFAULT 0,
        punctuality_rate NUMERIC DEFAULT 0,
        quality_score NUMERIC DEFAULT 0,
        net_work_seconds INTEGER DEFAULT 0,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        calculation_version VARCHAR(20) DEFAULT '1.0',
        UNIQUE(reporting_year, reporting_month, department_id, employee_id)
      );
    `);
    console.log('✅ Monthly performance snapshots table created');

    // Create indexes for workforce tables
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON employees(employee_number);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance_records(employee_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(attendance_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON tasks(department_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_assignments_employee_id ON task_assignments(employee_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_task_reviews_task_id ON task_reviews(task_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_year_month ON monthly_performance_snapshots(reporting_year, reporting_month);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(approval_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_work_schedules_employee_id ON work_schedules(employee_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_performance_targets_employee_id ON performance_targets(employee_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_performance_targets_department_id ON performance_targets(department_id);`);
    console.log('✅ Workforce indexes created');

    // ========================================================================
    // ADDITIONAL TABLES FOR PORTAL MANAGEMENT
    // ========================================================================

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) DEFAULT 'in_app',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        entity_type VARCHAR(50),
        entity_id UUID,
        action_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Notifications table created');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);`);

    // Customer documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        is_verified BOOLEAN DEFAULT false,
        verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Customer documents table created');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customer_documents_type ON customer_documents(document_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customer_documents_verified ON customer_documents(is_verified);`);

    // Refresh tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Refresh tokens table created');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);`);

    // Insert default departments
    await client.query(`
      INSERT INTO departments (name, description, status, monthly_target)
      VALUES 
        ('Operations', 'Core insurance operations department', 'active', 100),
        ('Claims', 'Claims processing and resolution', 'active', 80),
        ('Underwriting', 'Risk assessment and policy underwriting', 'active', 60),
        ('Customer Service', 'Customer support and inquiries', 'active', 120),
        ('Finance', 'Premium reconciliation and payments', 'active', 50),
        ('Administration', 'General administrative functions', 'active', 40)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Default departments created');

    // Insert sample insurance plans
    await client.query(`
      INSERT INTO insurance_plans (name, description, coverage_amount, premium_amount, duration_months, features, is_active)
      VALUES 
        ('Basic Health Insurance', 'Comprehensive health coverage for individuals and families', 100000.00, 500.00, 12, '["Hospitalization", "Outpatient Care", "Prescription Drugs", "Annual Health Checkup"]', true),
        ('Premium Health Insurance', 'Extended health coverage with additional benefits', 500000.00, 1500.00, 12, '["Hospitalization", "Outpatient Care", "Prescription Drugs", "Annual Health Checkup", "Dental Care", "Vision Care", "Mental Health"]', true),
        ('Life Insurance', 'Term life insurance for financial security', 1000000.00, 800.00, 24, '["Death Benefit", "Accidental Death", "Disability Benefit"]', true),
        ('Vehicle Insurance', 'Comprehensive vehicle coverage', 500000.00, 300.00, 12, '["Accident Coverage", "Theft Protection", "Third Party Liability", "Natural Disaster"]', true),
        ('Home Insurance', 'Protect your home and belongings', 200000.00, 250.00, 12, '["Fire Damage", "Theft", "Natural Disasters", "Liability Coverage"]', true)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Sample insurance plans created');

    console.log('🎉 Database initialization completed successfully!');
    return true;
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    return false;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase };
