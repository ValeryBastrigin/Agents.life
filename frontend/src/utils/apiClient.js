import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Don't set Content-Type for FormData — browser sets it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Send message to chat (non-streaming).
 * @param {Object} payload - { user_id, message, chat_id?, agent? }
 * @returns {Promise<{ response: string, chat_id: number, tokens_used: number, remaining_balance: number }>}
 */
export async function sendMessage(payload) {
  const response = await apiClient.post('/api/chat', payload);
  return response.data;
}

export { apiClient };
