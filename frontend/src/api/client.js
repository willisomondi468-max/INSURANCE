// API client for the Insurance Management System backend.
//
// Base URL resolution order:
//   1. REACT_APP_API_URL (set in .env / .env.local)
//   2. http://localhost:5000/api in development
//   3. same-origin /api in production
const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`);

// Pull the token straight from storage so callers do not have to thread it
// through every component. An explicit token argument still wins when given.
const getToken = (explicit) => explicit || localStorage.getItem('token');

/**
 * Turn a fetch failure into a useful message.
 *
 * A browser reports a refused connection, DNS failure or CORS block as a bare
 * `TypeError: Failed to fetch`, which tells the user nothing. This maps that
 * case onto an actionable message, and clears stored auth on 401 so the app
 * drops back to the login screen instead of looping on a dead token.
 */
const handleError = async (res, payload) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  const message =
    (payload && (payload.message || (payload.errors && payload.errors[0] && payload.errors[0].msg))) ||
    `Request failed with status ${res.status}`;

  const error = new Error(message);
  error.status = res.status;
  error.payload = payload;
  return error;
};

const request = async (method, endpoint, { data, token, raw } = {}) => {
  const authToken = getToken(token);

  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined
    });
  } catch (networkError) {
    // fetch() only rejects for network-level failures, never for HTTP errors.
    const error = new Error(
      `Cannot reach the API server at ${API_URL}. ` +
        'Make sure the backend is running (cd backend && npm run dev).'
    );
    error.cause = networkError;
    error.isNetworkError = true;
    throw error;
  }

  // Report downloads return a blob, not JSON.
  if (raw) {
    if (!res.ok) throw await handleError(res, null);
    return res.blob();
  }

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!res.ok) throw await handleError(res, payload);

  return payload;
};

const client = {
  get: (endpoint, token) => request('GET', endpoint, { token }),
  post: (endpoint, data, token) => request('POST', endpoint, { data, token }),
  put: (endpoint, data, token) => request('PUT', endpoint, { data, token }),
  delete: (endpoint, token) => request('DELETE', endpoint, { token }),

  /** Fetch a report (PDF/CSV) as a Blob and trigger a browser download. */
  download: async (endpoint, filename, token) => {
    const blob = await request('GET', endpoint, { token, raw: true });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export { API_URL };
export default client;