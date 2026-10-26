const { query, getClient } = require('../config/db');

/**
 * Customer Documents Controller
 * Staff can upload, view, and verify customer documents
 */

/**
 * Get customer documents
 * GET /api/staff/customers/:id/documents
 */
const getCustomerDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const companyScope = req.companyScope;

    // Verify customer exists and is accessible
    const customerResult = await query(
      `SELECT cd.id, cd.user_id FROM customer_details cd
       JOIN users u ON cd.user_id = u.id
       WHERE cd.id = $1${companyScope ? ' AND u.company_id = $2' : ''}`,
      companyScope ? [id, companyScope] : [id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const userId = customerResult.rows[0].user_id;

    const result = await query(
      `SELECT * FROM customer_documents
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: { documents: result.rows }
    });
  } catch (error) {
    console.error('Get customer documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer documents'
    });
  }
};

/**
 * Upload customer document
 * POST /api/staff/customers/:id/documents
 */
const uploadCustomerDocument = async (req, res) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { documentType, documentName, filePath, fileSize, mimeType } = req.body;
    const staffUserId = req.user.id;
    const companyScope = req.companyScope;

    // Verify customer exists and is accessible
    const customerResult = await query(
      `SELECT cd.user_id FROM customer_details cd
       JOIN users u ON cd.user_id = u.id
       WHERE cd.id = $1${companyScope ? ' AND u.company_id = $2' : ''}`,
      companyScope ? [id, companyScope] : [id]
    );

    if (customerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customerUserId = customerResult.rows[0].user_id;

    const docResult = await client.query(
      `INSERT INTO customer_documents (customer_id, document_type, document_name, file_path, file_size, mime_type, uploaded_by, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING *`,
      [customerUserId, documentType, documentName, filePath, fileSize, mimeType, staffUserId]
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'upload_document', 'customer_document', $2, $3, $4)`,
      [staffUserId, docResult.rows[0].id, JSON.stringify({ documentType, documentName }), req.ip]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document: docResult.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  } finally {
    client.release();
  }
};

/**
 * Verify customer document
 * PUT /api/staff/customers/:id/documents/:docId/verify
 */
const verifyCustomerDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const { isVerified } = req.body;
    const staffUserId = req.user.id;
    const companyScope = req.companyScope;

    const docResult = await query(
      `SELECT cd.*, u.company_id
       FROM customer_documents cd
       JOIN users u ON cd.customer_id = u.id
       WHERE cd.id = $1${companyScope ? ' AND u.company_id = $2' : ''}`,
      companyScope ? [docId, companyScope] : [docId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    await query(
      `UPDATE customer_documents
       SET is_verified = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [isVerified, staffUserId, docId]
    );

    // Create audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, 'customer_document', $3, $4, $5)`,
      [staffUserId, isVerified ? 'verify_document' : 'unverify_document', docId,
       JSON.stringify({ isVerified }), req.ip]
    );

    res.json({
      success: true,
      message: `Document ${isVerified ? 'verified' : 'unverified'} successfully`
    });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify document'
    });
  }
};

module.exports = {
  getCustomerDocuments,
  uploadCustomerDocument,
  verifyCustomerDocument
};
