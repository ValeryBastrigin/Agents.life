import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import { User, Menu, Sun, Moon, ArrowLeft } from 'lucide-react';
import Secretary from './pages/Secretary';
import Accountant from './pages/Accountant';
import Profile from './pages/Profile';
import axios from 'axios';

const API_URL = 'http://localhost:8001';

function App() {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userId] = useState(1); // Default user for MVP

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user/${userId}`);
      setUserProfile(response.data);
      setTheme(response.data.theme_preference);
    } catch (error) {
      console.error('Failed to load user profile:', error);
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

  return (
    <Router>
      <AppContent
        theme={theme}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userProfile={userProfile}
        handleThemeToggle={handleThemeToggle}
      />
    </Router>
  );
}

function AppContent({ theme, sidebarOpen, setSidebarOpen, userProfile, handleThemeToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [userId] = useState(1);

  // Load user chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user-chats`, { params: { user_id: userId } });
      setChats(response.data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const handleSelectChat = (chatId) => {
    navigate(`/chat/${chatId}`);
  };

  const handleNewChat = () => {
    navigate('/');
  };

  return (
    <div className={`h-screen flex flex-col bg-background-light dark:bg-background-dark ${theme}`}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        chats={chats}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      {/* Header */}
      {location.pathname !== '/profile' && (
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-background-light dark:bg-background-dark flex-shrink-0">
        <div className="flex items-center gap-3">
          {location.pathname === '/secretary' || location.pathname === '/accountant' ? (
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            {location.pathname === '/' ? 'Agents' : 
             location.pathname === '/secretary' ? 'Secretary' :
             location.pathname === '/accountant' ? 'Accountant' : 'Agents'}
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
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <User size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </header>
      )}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Home onChatCreated={loadChats} />} />
        <Route path="/chat/:chatId" element={<Home onChatCreated={loadChats} />} />
        <Route path="/secretary" element={<Secretary />} />
        <Route path="/accountant" element={<Accountant />} />
        <Route path="/profile" element={<Profile userProfile={userProfile} theme={theme} onThemeToggle={handleThemeToggle} onBack={() => navigate('/')} />} />
      </Routes>
    </div>
  );
}

function Home({ onChatCreated }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [userId] = useState(1);
  const messagesEndRef = React.useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat based on URL
  useEffect(() => {
    const loadChat = async () => {
      const pathMatch = location.pathname.match(/^\/chat\/(\d+)$/);
      
      if (pathMatch) {
        // Load specific chat from URL
        const id = parseInt(pathMatch[1]);
        setChatId(id);
        await loadChatMessages(id);
      } else {
        // Start new chat - clear messages
        setMessages([]);
        setChatId(null);
      }
    };
    
    loadChat();
  }, [location.pathname]);

  const loadChatMessages = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/chats/${id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (message) => {
    setIsLoading(true);
    
    // Add user message to chat
    const userMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        user_id: userId,
        message: message,
        chat_id: chatId,
        history: messages,
      });

      // Update chat_id if it's a new chat
      if (!chatId && response.data.chat_id) {
        setChatId(response.data.chat_id);
        // Navigate to the new chat URL
        navigate(`/chat/${response.data.chat_id}`);
        // Refresh chats list in sidebar
        if (onChatCreated) {
          onChatCreated();
        }
      }

      // Add assistant response to chat
      const assistantMessage = { role: 'assistant', content: response.data.response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, there was an error processing your message.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">
              Chat with your AI Assistant
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col space-y-4 py-4 mt-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[70%] px-4 py-2 rounded-[1.5rem] ${
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
                <div className="bg-surface-light dark:bg-surface-dark px-4 py-2 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Footer */}
      <div className="flex-shrink-0 px-4 py-4 bg-background-light dark:bg-background-dark">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

export default App;
