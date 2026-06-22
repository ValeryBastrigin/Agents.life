import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import ProfileModal from './components/ProfileModal';
import { User, Menu, Sun, Moon } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId] = useState(1); // Default user for MVP

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
    loadUserProfile();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/agents`);
      setAgents(response.data);
      if (response.data.length > 0) {
        setSelectedAgent(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user/${userId}`);
      setUserProfile(response.data);
      setTheme(response.data.theme_preference);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const handleSendMessage = async (message) => {
    if (!selectedAgent) return;

    setIsLoading(true);
    
    // Add user message to chat
    const userMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        user_id: userId,
        agent_name: selectedAgent.name,
        message: message,
      });

      // Add assistant response to chat
      const assistantMessage = { role: 'assistant', content: response.data.response };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update user profile with new token balance
      setUserProfile((prev) => ({
        ...prev,
        token_balance: response.data.remaining_balance,
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, there was an error processing your message.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    try {
      await axios.put(`${API_URL}/api/user/${userId}/theme`, { theme: newTheme });
      setUserProfile((prev) => ({ ...prev, theme_preference: newTheme }));
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
    setMessages([]); // Clear messages when switching agents
  };

  return (
    <div className={`min-h-screen bg-background-light dark:bg-background-dark ${theme}`}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        agents={agents}
        selectedAgent={selectedAgent}
        onSelectAgent={handleAgentSelect}
        theme={theme}
      />

      {/* Main Content */}
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-background-light dark:bg-background-dark">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
              {selectedAgent ? selectedAgent.name : 'LifeAgent'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleThemeToggle}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon size={20} className="text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun size={20} className="text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <button
              onClick={() => setProfileModalOpen(true)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <User size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 sm:pb-32">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">
                {selectedAgent
                  ? `Chat with ${selectedAgent.name}`
                  : 'Select an agent to start chatting'}
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6 pt-8">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-5 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-surface-light dark:bg-surface-dark text-gray-800 dark:text-white'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-light dark:bg-surface-dark px-5 py-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading || !selectedAgent}
        />
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userProfile={userProfile}
        onThemeToggle={handleThemeToggle}
        theme={theme}
      />
    </div>
  );
}

export default App;
