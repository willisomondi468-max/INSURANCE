/**
 * Supabase Client Configuration
 * 
 * Configure your Supabase project at: https://supabase.com/dashboard
 * 
 * 1. Create a free project at https://supabase.com
 * 2. Go to Project Settings → API to get your:
 *    - Project URL (e.g., https://xxxxx.supabase.co)
 *    - Anon public key
 * 3. Add these to backend/.env:
 *    - VITE_SUPABASE_URL=https://your-project-ref.supabase.co
 *    - VITE_SUPABASE_ANON_KEY=your-anon-public-key
 */

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Supabase client for direct database access from frontend
 * (Optional - the existing JWT auth system still works)
 */
export const createSupabaseClient = (accessToken = null) => {
  const headers = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (supabaseAnonKey) {
    headers.apikey = supabaseAnonKey;
  }

  return {
    baseUrl: supabaseUrl,
    headers,

    async request(endpoint, options = {}) {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
      }

      const url = `${supabaseUrl}/rest/v1/${endpoint}`;
      const config = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': options.prefer || 'return=representation',
          ...headers,
          ...options.headers,
        },
        ...(options.body && { body: JSON.stringify(options.body) }),
      };

      return fetch(url, config)
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error?.message || `Request failed: ${res.status}`);
          }
          return data;
        });
    },

    async select(table, filters = {}, options = {}) {
      const queryString = new URLSearchParams(filters).toString();
      return this.request(`${table}?${queryString}`, {
        method: 'GET',
        headers: options.headers,
      });
    },

    async insert(table, data, options = {}) {
      return this.request(table, {
        method: 'POST',
        body: data,
        headers: options.headers,
        prefer: options.prefer || 'return=representation',
      });
    },

    async update(table, id, data, options = {}) {
      return this.request(`${table}?id=eq.${id}`, {
        method: 'PATCH',
        body: data,
        headers: options.headers,
        prefer: options.prefer || 'return=representation',
      });
    },

    async delete(table, id, options = {}) {
      return this.request(`${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: options.headers,
      });
    },
  };
};

export default { supabaseUrl, supabaseAnonKey, createSupabaseClient };
