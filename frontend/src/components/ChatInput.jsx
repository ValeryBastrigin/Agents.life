import React, { useState } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';

const ChatInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4 z-30">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 bg-surface-light dark:bg-surface-dark rounded-3xl shadow-lg shadow-gray-900/10 dark:shadow-black/30 p-3">
          {/* Attachment Button */}
          <button
            type="button"
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 flex-shrink-0"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>

          {/* Input Field */}
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message..."
            disabled={disabled}
            className="flex-1 px-4 py-3 bg-transparent text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none disabled:opacity-50 text-base min-w-0"
          />

          {/* Voice Input Button */}
          <button
            type="button"
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 flex-shrink-0"
            title="Voice input"
          >
            <Mic size={20} />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
