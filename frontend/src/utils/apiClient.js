import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 120000,
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
    // ❗ Paywall: show upgrade modal on 402 Payment Required
    if (error.response?.status === 402) {
      console.warn('Paywall triggered:', error.response?.data?.detail || 'Billing limit exceeded');
      window.dispatchEvent(new CustomEvent('paywall:show'));
      // Return a rejected promise that the caller can handle gracefully
      return Promise.reject(error);
    }
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

/**
 * Send message to chat with SSE streaming.
 * 
 * @param {Object} payload - { user_id, message, chat_id?, agent?, history? }
 * @param {Object} callbacks
 * @param {Function} callbacks.onToken - Called with (token: string) for each text chunk
 * @param {Function} callbacks.onWidget - Called with (widgetData: object) for widget JSON
 * @param {Function} callbacks.onDone - Called with (metadata: { chat_id, is_new_chat, full_content })
 * @param {Function} callbacks.onError - Called with (error: Error)
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the fetch
 * @returns {Promise<void>}
 */
export async function sendMessageStream(payload, callbacks, signal) {
  const { onToken, onWidget, onDone, onError } = callbacks;

  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal, // Pass signal to fetch
    });

    if (!response.ok) {
      const errorText = await response.text();

      // ❗ Paywall: show upgrade modal on 402 Payment Required
      if (response.status === 402) {
        console.warn('Paywall triggered (stream):', errorText);
        window.dispatchEvent(new CustomEvent('paywall:show'));
        // Don't throw — caller's onError won't show misleading "извините, ошибка"
        // Instead, just stop processing
        if (onError) onError(new Error('paywall'));
        return;
      }

      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Parse complete SSE events from buffer (separated by double newlines)
      const eventSeparator = '\n\n';
      let eventEndIndex;
      
      while ((eventEndIndex = buffer.indexOf(eventSeparator)) !== -1) {
        const eventBlock = buffer.substring(0, eventEndIndex);
        buffer = buffer.substring(eventEndIndex + eventSeparator.length);
        
        // Parse all data lines within this event block
        const lines = eventBlock.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6);
            try {
              const data = JSON.parse(jsonStr);
              
              switch (data.type) {
                case 'token':
                  if (onToken) onToken(data.content);
                  break;
                case 'widget':
                  if (onWidget) onWidget(data.content);
                  break;
                case 'done':
                  if (onDone) onDone({
                    chat_id: data.chat_id,
                    is_new_chat: data.is_new_chat,
                    full_content: data.full_content,
                    agent_name: data.agent_name,
                  });
                  break;
              }
            } catch (e) {
              // Silently skip unparseable events
            }
          }
        }
      }
    }
  } catch (error) {
    // Check if the request was aborted — silently ignore
    if (error.name === 'AbortError') {
      console.log('Streaming request was cancelled');
      if (onError) onError(new Error('cancelled'));
      return;
    }
    console.error('Streaming error:', error);
    if (onError) onError(error);
  }
}

/**
 * Save diet plan to database.
 * @param {number} userId
 * @param {string} planData - JSON string of meal plan
 * @returns {Promise<Object>}
 */
export async function saveDietPlan(userId, planData) {
  const response = await apiClient.put(`/api/dietplan/${userId}`, { plan_data: planData });
  return response.data;
}

/**
 * Get diet plan from database.
 * @param {number} userId
 * @returns {Promise<{plan_data: string|null}>}
 */
export async function getDietPlan(userId) {
  const response = await apiClient.get(`/api/dietplan/${userId}`);
  return response.data;
}

/**
 * Create a new chat with optional welcome message.
 * @param {Object} params - { user_id, title, agent_type, welcome_message }
 * @returns {Promise<{ id: number, chat_id: number, title: string }>}
 */
export async function createChat(params) {
  const response = await apiClient.post('/api/chats', params);
  return response.data;
}

/**
 * Delete diet plan from database.
 * @param {number} userId
 * @returns {Promise<Object>}
 */
export async function deleteDietPlan(userId) {
  const response = await apiClient.delete(`/api/dietplan/${userId}`);
  return response.data;
}

/**
 * Get user's diet profile (height, weight, age, gender, goal, etc.)
 * @param {number} userId
 * @returns {Promise<{profile: object|null}>}
 */
export async function getUserDietProfile(userId) {
  const response = await apiClient.get(`/api/dietplan/profile/${userId}`);
  return response.data;
}

/**
 * Save/update user's diet profile
 * @param {number} userId
 * @param {Object} profileData - { height, weight, age, gender, goal, activity_level, calorie_target, protein_target, fats_target, carbs_target, water_target }
 * @returns {Promise<Object>}
 */
export async function saveUserDietProfile(userId, profileData) {
  const response = await apiClient.post(`/api/dietplan/profile/${userId}`, profileData);
  return response.data;
}

export { apiClient };