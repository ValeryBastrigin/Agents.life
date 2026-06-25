import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import AnimatedBackground from './components/AnimatedBackground';
import { User, Menu, Sun, Moon, ArrowLeft } from 'lucide-react';
import Secretary from './pages/Secretary';
import Accountant from './pages/Accountant';
import Profile from './pages/Profile';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
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

  // Set initial theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
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
    localStorage.setItem('theme', newTheme);

    try {
      await axios.put(`${API_URL}/api/user/${userId}/theme`, { theme: newTheme });
      setUserProfile((prev) => ({ ...prev, theme_preference: newTheme }));
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return (
    <LanguageProvider>
      <Router>
        <AppContent
          theme={theme}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userProfile={userProfile}
          handleThemeToggle={handleThemeToggle}
        />
      </Router>
    </LanguageProvider>
  );
}

function AppContent({ theme, sidebarOpen, setSidebarOpen, userProfile, handleThemeToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, changeLanguage, t } = useLanguage();
  const [chats, setChats] = useState([]);
  const [userId] = useState(1);

  // Load user chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user-chats`, { params: { user_id: userId } });
      // Sort chats: pinned first, then by date
      const sortedChats = response.data.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setChats(sortedChats);
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

  const handleDeleteChat = (deletedChatId) => {
    // Remove deleted chat from list
    setChats((prev) => prev.filter((chat) => chat.id !== deletedChatId));

    // If current chat was deleted, navigate to home
    const currentChatId = location.pathname.match(/^\/chat\/(\d+)$/);
    if (currentChatId && parseInt(currentChatId[1]) === deletedChatId) {
      navigate('/');
    }
  };

  const handleRenameChat = async (chatId, newTitle) => {
    try {
      await axios.put(`${API_URL}/api/chats/${chatId}/rename`, { new_title: newTitle });
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, title: newTitle } : chat
        )
      );
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const handlePinChat = async (chatId) => {
    try {
      const response = await axios.put(`${API_URL}/api/chats/${chatId}/pin`);
      const updatedChat = response.data.chat;
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, is_pinned: updatedChat.is_pinned } : chat
        )
      );
    } catch (error) {
      console.error('Failed to pin chat:', error);
    }
  };

  return (
    <div className={`h-screen flex flex-col bg-background-light dark:bg-background-dark ${theme} relative`}>
      {/* Animated Background - Only visible on chat pages */}
      {location.pathname !== '/profile' && location.pathname !== '/secretary' && location.pathname !== '/accountant' && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <AnimatedBackground theme={theme} isLoading={false} />
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        chats={chats}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onPinChat={handlePinChat}
      />

      {/* Header */}
      {location.pathname !== '/profile' && (
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 flex-shrink-0 bg-transparent">
        <div className="flex items-center gap-3">
          {location.pathname === '/secretary' || location.pathname === '/accountant' ? (
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {location.pathname === '/' ? 'Agents' :
             location.pathname === '/secretary' ? 'Secretary' :
             location.pathname === '/accountant' ? 'Accountant' : 'Agents'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-full transition-colors"
          >
            <User size={24} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </header>
      )}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Home onChatCreated={loadChats} theme={theme} />} />
        <Route path="/chat/:chatId" element={<Home onChatCreated={loadChats} theme={theme} />} />
        <Route path="/secretary" element={<Secretary />} />
        <Route path="/accountant" element={<Accountant />} />
        <Route path="/profile" element={<Profile userProfile={userProfile} theme={theme} onThemeToggle={handleThemeToggle} onBack={() => navigate('/')} />} />
      </Routes>
    </div>
  );
}

function Home({ onChatCreated, theme }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [userId] = useState(1);
  const messagesEndRef = React.useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

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
    <div className="flex flex-col h-full relative">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 relative z-10">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">
              {t('chatWithAgents')}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col space-y-4 py-4">
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
      <div className="flex-shrink-0 px-4 py-4 bg-background-light dark:bg-background-dark relative z-10">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

export default App;
