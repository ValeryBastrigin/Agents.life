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
 * @returns {Promise<void>}
 */
export async function sendMessageStream(payload, callbacks) {
  const { onToken, onWidget, onDone, onError } = callbacks;

  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
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

export { apiClient };
