import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Toaster, toast } from 'react-hot-toast';
import { date, humanize } from '../../api';

// Staff Customer Documents - upload and manage customer documents
const StaffCustomerDocuments = ({ customerId, customerName }) => {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({
    documentType: '',
    documentName: '',
    filePath: ''
  });

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get(`/staff/customers/${customerId}/documents`);
      if (res.success) {
        setDocuments(res.data.documents);
      }
    } catch (err) {
      toast.error('Failed to load documents');
    }
  }, [customerId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newDoc.documentType || !newDoc.documentName || !newDoc.filePath) {
      toast.error('All fields are required');
      return;
    }
    try {
      setUploading(true);
      const res = await api.post(`/staff/customers/${customerId}/documents`, newDoc);
      if (res.success) {
        setDocuments([res.data.document, ...documents]);
        setNewDoc({ documentType: '', documentName: '', filePath: '' });
        toast.success('Document uploaded successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (docId, isVerified) => {
    try {
      const res = await api.put(
        `/staff/customers/${customerId}/documents/${docId}/verify`,
        { isVerified }
      );
      if (res.success) {
        setDocuments(documents.map(d =>
          d.id === docId ? { ...d, is_verified: isVerified } : d
        ));
        toast.success(`Document ${isVerified ? 'verified' : 'unverified'}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to verify document');
    }
  };

  return (
    <div className="fade-in">
      <Toaster position="top-right" />
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Customer Documents</h1>
          <p className="dashboard-subtitle">
            Manage documents for {customerName}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label className="form-label">Document Type</label>
              <select
                value={newDoc.documentType}
                onChange={e => setNewDoc({ ...newDoc, documentType: e.target.value })}
                className="form-input"
              >
                <option value="">Select type</option>
                <option value="id_proof">ID Proof</option>
                <option value="address_proof">Address Proof</option>
                <option value="income_proof">Income Proof</option>
                <option value="medical_record">Medical Record</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Document Name</label>
              <input
                type="text"
                value={newDoc.documentName}
                onChange={e => setNewDoc({ ...newDoc, documentName: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">File Path / URL</label>
              <input
                type="text"
                value={newDoc.filePath}
                onChange={e => setNewDoc({ ...newDoc, filePath: e.target.value })}
                className="form-input"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="card-header">
            <span className="card-title">Documents ({documents.length})</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px' }}>Type</th>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Uploaded</th>
                  <th style={{ padding: '12px' }}>Verified</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>{humanize(doc.document_type)}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{doc.document_name}</td>
                      <td style={{ padding: '12px' }}>{date(doc.created_at)}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${doc.is_verified ? 'badge-success' : 'badge-warning'}`}>
                          {doc.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleVerify(doc.id, !doc.is_verified)}
                        >
                          {doc.is_verified ? 'Unverify' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffCustomerDocuments;
