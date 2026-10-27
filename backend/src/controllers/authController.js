const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

/**
 * Generate access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Tokens
 */
const generateTokens = async (user) => {
  // Access token (15 minutes)
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  // Refresh token (7 days)
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  // Store refresh token in database (non-blocking)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  ).catch(() => {});

  return { accessToken, refreshToken };
};

/**
 * Register a new user (Customer)
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const client = await require('../config/db').getClient();
  
  try {
    await client.query('BEGIN');

    const { email, password, phone, fullName, idNumber, address, dateOfBirth } = req.body;

    // Default optional fields
    const idNum = idNumber || '';
    const addr = address || '';
    const dob = dateOfBirth || '';

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, phone) 
       VALUES ($1, $2, 'customer', $3) 
       RETURNING id, email, role, phone, created_at`,
      [email, passwordHash, phone]
    );

    const user = userResult.rows[0];

    // Create customer details
    await client.query(
      `INSERT INTO customer_details (user_id, full_name, id_number, phone, email, address, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, fullName, idNum, phone, email, addr, dob]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address)
       VALUES ($1, 'register', 'user', $2, $3)`,
      [user.id, JSON.stringify({ email }), req.ip]
    );

    await client.query('COMMIT');

    // Generate tokens
    const tokens = await generateTokens(user);

    // Send welcome email
    try {
      await sendEmail(email, 'Welcome to Insurance Management System', 'welcome', { 
        name: fullName 
      });
    } catch (emailError) {
      console.log('Email sending failed:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          phone: user.phone
        },
        ...tokens
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  } finally {
    client.release();
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.role, u.phone, u.is_active, u.created_at,
              cd.full_name, cd.id_number
       FROM users u
       LEFT JOIN customer_details cd ON u.id = cd.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Log failed login attempt (non-blocking)
      query(
        `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address)
         VALUES ($1, 'login_failed', 'user', $2, $3)`,
        [user.id, JSON.stringify({ email }), req.ip]
      ).catch(() => {});
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokens = await generateTokens(user);

    // Log successful login (non-blocking)
    query(
      `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address)
       VALUES ($1, 'login', 'user', $2, $3)`,
      [user.id, JSON.stringify({ email }), req.ip]
    ).catch(() => {});

    // Customer details already loaded via JOIN above
    const customerDetails = user.role === 'customer' ? {
      id: user.id,
      full_name: user.full_name,
      id_number: user.id_number
    } : null;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          phone: user.phone,
          fullName: user.full_name || null
        },
        customerDetails,
        ...tokens
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if token exists in database
    const tokenResult = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.userId]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Get user
    const userResult = await query(
      'SELECT id, email, role, phone, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const user = userResult.rows[0];

    // Delete old refresh token
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

    // Generate new tokens
    const tokens = await generateTokens(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    // Log logout
    if (req.user) {
      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address)
         VALUES ($1, 'logout', 'user', $2, $3)`,
        [req.user.id, JSON.stringify({ email: req.user.email }), req.ip]
      );
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * Forgot password - request password reset
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const result = await query(
      `SELECT id, email FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal whether email exists - always return success
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    const user = result.rows[0];

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3`,
      [user.id, resetToken, expiresAt]
    );

    // Send reset email if email service is configured
    try {
      await sendEmail(email, 'Password Reset Request', 'password-reset', {
        name: user.email,
        resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      });
    } catch (emailError) {
      console.log('Email sending failed:', emailError.message);
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * Reset password - set new password using reset token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(401).json({
        success: false,
        message: 'Invalid reset token type'
      });
    }

    // Verify token exists in database and not expired
    const tokenResult = await query(
      `SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()`,
      [token, decoded.userId]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user password
    await query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [passwordHash, decoded.userId]
    );

    // Delete used reset token
    await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

/**
 * Check if customer details exist
 * POST /api/auth/check-existence
 */
const checkExistence = async (req, res) => {
  try {
    const { idNumber, phone } = req.body;

    if (!idNumber && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide ID number or phone number'
      });
    }

    // Query customer details
    let queryText = `
      SELECT cd.*, u.email, u.phone as user_phone, u.is_active
      FROM customer_details cd
      JOIN users u ON cd.user_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];

    if (idNumber) {
      queryParams.push(idNumber);
      queryText += ` AND cd.id_number = $${queryParams.length}`;
    }

    if (phone) {
      queryParams.push(phone);
      queryText += ` OR cd.phone = $${queryParams.length}`;
    }

    const result = await query(queryText, queryParams);

    if (result.rows.length > 0) {
      const customer = result.rows[0];
      return res.json({
        success: true,
        exists: true,
        data: {
          id: customer.id,
          userId: customer.user_id,
          fullName: customer.full_name,
          idNumber: customer.id_number,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          dateOfBirth: customer.date_of_birth,
          isVerified: customer.is_verified,
          isActive: customer.is_active
        }
      });
    }

    res.json({
      success: true,
      exists: false,
      data: null
    });
  } catch (error) {
    console.error('Check existence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check customer existence'
    });
  }
};

/**
 * Confirm customer details
 * POST /api/auth/confirm-details
 */
const confirmDetails = async (req, res) => {
  try {
    const { customerId, isConfirmed } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
    }

    if (isConfirmed) {
      // Get customer details and proceed to create user account
      const customerResult = await query(
        'SELECT * FROM customer_details WHERE id = $1',
        [customerId]
      );

      if (customerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const customer = customerResult.rows[0];

      // Check if user already exists
      if (customer.user_id) {
        return res.json({
          success: true,
          message: 'Customer details confirmed. Please login.',
          data: { hasAccount: true }
        });
      }

      // Return customer details for registration
      res.json({
        success: true,
        message: 'Customer details confirmed',
        data: {
          hasAccount: false,
          customer: {
            fullName: customer.full_name,
            idNumber: customer.id_number,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            dateOfBirth: customer.date_of_birth
          }
        }
      });
    } else {
      // Allow update - return editable form
      const customerResult = await query(
        'SELECT * FROM customer_details WHERE id = $1',
        [customerId]
      );

      res.json({
        success: true,
        message: 'Please update incorrect details',
        data: {
          requiresUpdate: true,
          customer: customerResult.rows[0]
        }
      });
    }
  } catch (error) {
    console.error('Confirm details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm details'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  checkExistence,
  confirmDetails,
  forgotPassword,
  resetPassword
};
