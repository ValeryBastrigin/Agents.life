import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SecretaryBackground from './components/SecretaryBackground';
import AccountantBackground from './components/AccountantBackground';
import PsychologistBackground from './components/PsychologistBackground';
import DietitianBackground from './components/DietitianBackground';
import MentorBackground from './components/MentorBackground';
import ChatInput from './components/ChatInput';
import AnimatedBackground from './components/AnimatedBackground';
import ChatWidgetRenderer from './components/ui/widgets/ChatWidgetRenderer';
import MarkdownRenderer from './components/MarkdownRenderer';
import { User, Menu, ArrowLeft, Bot, User as UserIcon, Clock, XCircle } from 'lucide-react';
import Secretary from './pages/Secretary';
import Accountant from './pages/Accountant';
import Dietitian from './pages/Dietitian';
import DietPlanPage from './pages/DietPlanPage';
import Psychologist from './pages/Psychologist';
import TherapySessions from './pages/TherapySessions';
import PsychologistDiary from './pages/PsychologistDiary';
import Mentor from './pages/Mentor';
import DevelopmentTree from './pages/DevelopmentTree';
import HabitTracker from './pages/HabitTracker';
import Profile from './pages/Profile';
import ActivityLog from './pages/ActivityLog';
import SecretaryGuide from './pages/SecretaryGuide';
import NotesList from './pages/NotesList';
import NoteEditor from './pages/NoteEditor';
import FinancialAnalyst from './pages/FinancialAnalyst';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import axios from 'axios';
import { sendMessageStream, apiClient } from './utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

function App() {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userId] = useState(1);

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

  // Listen for avatar changes from Profile page
  useEffect(() => {
    const handleAvatarChange = (e) => {
      setUserProfile((prev) => {
        if (!prev) return prev;
        return { ...prev, avatar_url: e.detail };
      });
    };
    window.addEventListener('avatar-changed', handleAvatarChange);
    return () => window.removeEventListener('avatar-changed', handleAvatarChange);
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
  const [headerSolid, setHeaderSolid] = useState(false);

  // ── Session state (shared with header capsule) ──
  const [activeSession, setActiveSession] = useState(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [sessionEndSuccess, setSessionEndSuccess] = useState(false);
  const sessionTimerRef = useRef(null);

  // Parse current chat ID from URL
  const currentChatId = (() => {
    const match = location.pathname.match(/^\/chat\/(\d+)$/);
    return match ? parseInt(match[1]) : null;
  })();

  // Periodically check session status
  useEffect(() => {
    const interval = setInterval(() => {
      checkSessionStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Timer for elapsed time display
  useEffect(() => {
    if (activeSession) {
      const startTime = new Date(activeSession.started_at || activeSession.created_at).getTime();
      const updateTimer = () => {
        setSessionElapsed(Math.floor((Date.now() - startTime) / 1000));
      };
      updateTimer();
      sessionTimerRef.current = setInterval(updateTimer, 1000);
      return () => clearInterval(sessionTimerRef.current);
    } else {
      setSessionElapsed(0);
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    }
  }, [activeSession?.id]);

  // Check session on mount & when location changes to /chat
  useEffect(() => {
    checkSessionStatus();
  }, [location.pathname]);

  const checkSessionStatus = async () => {
    try {
      const res = await apiClient.get(`/api/user/${userId}/therapy/active`);
      if (res.data?.active && res.data?.session) {
        setActiveSession(res.data.session);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Failed to check session:', err);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    setIsEndingSession(true);
    try {
      await apiClient.post(`/api/user/${userId}/therapy-sessions/${activeSession.id}/force-end`);
      setSessionEndSuccess(true);
      // Через 3 секунды закрываем модалку и убираем виджет
      setTimeout(() => {
        setActiveSession(null);
        setSessionElapsed(0);
        setShowEndConfirm(false);
        setSessionEndSuccess(false);
        setIsEndingSession(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to end session:', err);
      setIsEndingSession(false);
    }
  };

  const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}ч ${m.toString().padStart(2, '0')}м`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  // ── end session state ──

  // Load user chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  // Reset headerSolid when navigating to agent pages (not chat)
  useEffect(() => {
    if (
      location.pathname === '/psychologist' ||
      location.pathname === '/secretary' ||
      location.pathname === '/accountant' ||
      location.pathname === '/dietitian' ||
      location.pathname.startsWith('/dietitian/plan') ||
      location.pathname === '/mentor'
    ) {
      setHeaderSolid(false);
    }
  }, [location.pathname]);

  // Listen for psychologist page scroll to make header solid
  useEffect(() => {
    const handlePsychologistScroll = (e) => {
      setHeaderSolid(e.detail);
    };
    window.addEventListener('psychologist-scroll', handlePsychologistScroll);
    return () => window.removeEventListener('psychologist-scroll', handlePsychologistScroll);
  }, []);

  // Track scroll to make header solid when messages are under it
  const handleScroll = (scrollTop) => {
    setHeaderSolid(scrollTop > 0);
  };

  const loadChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user-chats`, { params: { user_id: userId } });
      console.log('Loaded chats:', response.data);
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
    navigate('/chat');
  };

  const handleDeleteChat = (deletedChatId) => {
    // Remove deleted chat from list
    setChats((prev) => prev.filter((chat) => chat.id !== deletedChatId));

    // If current chat was deleted, navigate to home
    const currentChatId = location.pathname.match(/^\/chat\/(\d+)$/);
    if (currentChatId && parseInt(currentChatId[1]) === deletedChatId) {
      navigate('/chat');
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
    <div className={`h-screen flex flex-col bg-background-light dark:bg-background-dark ${theme} relative overflow-hidden`}>
      {/* Animated Background - Only visible on chat pages */}
      {!location.pathname.startsWith('/profile') && !location.pathname.startsWith('/secretary') && !location.pathname.startsWith('/accountant') && !location.pathname.startsWith('/dietitian') && !location.pathname.startsWith('/psychologist') && !location.pathname.startsWith('/mentor') && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <AnimatedBackground theme={theme} isLoading={false} />
        </div>
      )}

      {/* Global agent backgrounds - behind header too */}
      {location.pathname.startsWith('/secretary') && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <SecretaryBackground theme={theme} />
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
      {location.pathname !== '/profile' && location.pathname !== '/mentor/tree' && location.pathname !== '/secretary/logs' && !location.pathname.startsWith('/dietitian/plan') && !location.pathname.startsWith('/financial-analyst') && (
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 flex-shrink-0 bg-transparent">
        <div className="flex items-center gap-3">
          <span className={`px-1 py-1 rounded-full transition-all duration-300 ${location.pathname.startsWith('/chat') || location.pathname === '/psychologist' || location.pathname === '/accountant' || location.pathname === '/mentor' ? 'bg-transparent' : headerSolid ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl' : 'bg-transparent'}`}>
          {location.pathname.startsWith('/secretary/notes') ? (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
          ) : (location.pathname === '/secretary' || location.pathname === '/accountant' || location.pathname === '/dietitian' || location.pathname === '/psychologist' || location.pathname === '/mentor') ? (
            <button
              onClick={() => navigate('/chat')}
              className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className={`${location.pathname === '/psychologist' || location.pathname === '/accountant' || location.pathname === '/mentor' ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`} />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
          </span>
          <span className={`px-3 py-1.5 rounded-full transition-all duration-300 ${location.pathname.startsWith('/chat') || location.pathname === '/psychologist' || location.pathname === '/accountant' || location.pathname === '/mentor' ? 'bg-transparent' : headerSolid ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl' : 'bg-transparent'}`}>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {location.pathname.startsWith('/secretary/notes') ? (
              <>
                Ixteria
                <img src="/assets/icons/agents/ixteria.svg" alt="Ixteria" className="w-6 h-6 rounded-full" />
              </>
            ) : location.pathname === '/chat' ? (
              <>
                Ixteria
                <img src="/assets/icons/agents/ixteria.svg" alt="Ixteria" className="w-6 h-6 rounded-full" />
              </>
            ) :
              location.pathname === '/secretary' ? 'Тайм-Менеджер' :
              location.pathname === '/secretary/logs' ? 'Тайм-Менеджер' :
              location.pathname === '/accountant' ? <span className="text-gray-800 dark:text-white">Финансовый-помощник</span> :
              location.pathname === '/dietitian' ? 'Диетолог' :

              location.pathname === '/psychologist' ? <span className="text-gray-800 dark:text-white">Психолог</span> :
              location.pathname === '/mentor' ? <span className="text-gray-800 dark:text-white">Ментор</span> : 
             <>
                Ixteria
                <img src="/assets/icons/agents/ixteria.svg" alt="Ixteria" className="w-6 h-6 rounded-full" />
              </>}
          </h1>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* ═══ Active Session Capsule inside header — only for the chat where session is active ═══ */}
          {activeSession && currentChatId && activeSession.chat_id === currentChatId && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 rounded-full px-1.5 py-1.5 shadow-sm flex items-center gap-0.5 animate-fade-in">
              <Clock size={14} className="text-white animate-pulse" />
              <span className="text-white text-xs font-semibold whitespace-nowrap">
                {formatElapsed(sessionElapsed)}
              </span>
              <span className="text-white/90 text-xs ml-1">Завершить</span>
              <button
                onClick={() => setShowEndConfirm(true)}
                className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
                title="Завершить сеанс"
              >
                <XCircle size={14} className="text-white" />
              </button>
            </div>
          )}

          {/* ═══ Confirm End Session Modal (фирменный стиль) ═══ */}
          {showEndConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => {
              if (!isEndingSession) setShowEndConfirm(false);
            }}>
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl flex flex-col animate-fade-in">
                {sessionEndSuccess ? (
                  /* ═══ SUCCESS STATE ═══ */
                  <div className="px-6 py-10 text-center">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-5 animate-scale-in">
                      <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                      Сеанс завершён!
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Итоги сеанса записаны и доступны в разделе <br />
                      <strong>«Ваши сеансы терапий и итоги»</strong>.
                    </p>
                  </div>
                ) : isEndingSession ? (
                  /* ═══ LOADING STATE ═══ */
                  <div className="px-6 py-10 text-center">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center mb-5">
                      <svg className="animate-spin w-10 h-10 text-purple-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                      Подводим итоги сеанса...
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      ИИ-психолог формирует резюме вашего сеанса. <br />
                      Это займёт несколько секунд.
                    </p>
                  </div>
                ) : (
                  /* ═══ CONFIRM STATE ═══ */
                  <>
                    <div className="px-6 pt-8 pb-2 text-center">
                      <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-5">
                        <XCircle size={32} className="text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                        Завершить сеанс?
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Сеанс будет завершён, а его итоги появятся в разделе «Ваши сеансы терапий и итоги».
                      </p>
                    </div>

                    {/* Decorative divider */}
                    <div className="px-6 pt-4">
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
                    </div>

                    {/* Footer with buttons */}
                    <div className="px-6 pb-6 pt-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowEndConfirm(false)}
                          className="flex-1 px-4 py-3 rounded-[3rem] bg-surface-light dark:bg-surface-dark text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-sm"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => {
                            endSession();
                          }}
                          className="flex-1 px-4 py-3 rounded-[3rem] bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/25 text-sm"
                        >
                          Да, завершить
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <span className={`px-2 py-1.5 rounded-full transition-all duration-300 ${location.pathname.startsWith('/chat') || location.pathname === '/psychologist' || location.pathname === '/accountant' || location.pathname === '/mentor' ? 'bg-transparent' : headerSolid ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl' : 'bg-transparent'}`}>
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-full transition-colors"
          >
            <User size={24} className="text-gray-700 dark:text-gray-300" />
          </button>
          </span>
        </div>
      </header>
      )}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat/:chatId?" element={<Home onChatCreated={loadChats} theme={theme} onScroll={handleScroll} userProfile={userProfile} />} />
        <Route path="/secretary" element={<Secretary theme={theme} />} />
        <Route path="/secretary/logs" element={<ActivityLog theme={theme} />} />
        <Route path="/secretary/guide" element={<SecretaryGuide theme={theme} />} />
        <Route path="/secretary/notes" element={<NotesList theme={theme} />} />
        <Route path="/secretary/notes/:id" element={<NoteEditor theme={theme} />} />
        <Route path="/accountant" element={<Accountant />} />
        <Route path="/dietitian" element={<Dietitian />} />
        <Route path="/dietitian/plan" element={<DietPlanPage />} />
        <Route path="/psychologist" element={<Psychologist />} />
        <Route path="/psychologist/sessions" element={<TherapySessions />} />
        <Route path="/psychologist/diary" element={<PsychologistDiary />} />
        <Route path="/mentor" element={<Mentor />} />
        <Route path="/mentor/tree" element={<DevelopmentTree />} />
        <Route path="/mentor/habits" element={<HabitTracker />} />
        <Route path="/financial-analyst" element={<FinancialAnalyst />} />
        <Route path="/profile" element={<Profile key="profile" userProfile={userProfile} theme={theme} onThemeToggle={handleThemeToggle} onBack={() => navigate('/chat')} />} />
      </Routes>
    </div>
  );
}

// ── Agent avatar map ──
const AGENT_AVATARS = {
  ixteria: '/assets/icons/agents/ixteria.svg',
  agents: '/assets/icons/agents/ixteria.svg',
  dietitian: '/assets/icons/agents/диетолог.svg',
  secretary: '/assets/icons/agents/секретарь.svg',
  psychologist: '/assets/icons/agents/психолог.svg',
  mentor: '/assets/icons/agents/ментор.svg',
  accountant: '/assets/icons/agents/бухгалтер.svg',
};

function getAgentAvatar(agentName) {
  const name = (agentName || 'ixteria').toLowerCase();
  return AGENT_AVATARS[name] || AGENT_AVATARS.ixteria;
}

// ── Determine if content is a widget JSON ──
function isWidgetContent(content) {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && ['schedule', 'event_created', 'note_created', 'food_log', 'meal_plan', 'go_to_meal_plan'].includes(parsed.type);
  } catch {
    return false;
  }
}

// ── Helper: detect markdown formatting ──
function hasMarkdown(content) {
  return /[*_~`#>\[\]|\\-]/.test(content) || /\*\*|__|`|#|>|---|\||\[.+\]\(.+\)/.test(content);
}

// ── Helper: resolve relative /uploads/ URL to absolute ──
function resolveUploadUrl(url) {
  if (!url) return url;
  // Blob URL (локальный превью) — не трогаем
  if (url.startsWith('blob:')) return url;
  if (url.startsWith('/uploads/')) {
    return `${API_URL}${url}`;
  }
  return url;
}

// ── Helper: extract display text from possible JSON-structured message ──
function parseUserMessageContent(content) {
  // Try to parse as JSON with attachments structure
  if (typeof content === 'string') {
    // Legacy: messages saved as pure Markdown like ![image](/uploads/xxx.jpg)
    if (content.startsWith('![') || content.startsWith('[http')) {
      return content;
    }
    
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        // If it has a 'text' field, use it for display
        if (typeof parsed.text === 'string') {
          return parsed.text;
        }
        // Otherwise try to stringify nicely
        if (parsed.attachments || parsed.type) {
          return parsed.text || '';
        }
      }
    } catch {
      // Not JSON, return as-is
    }
  }
  return content;
}

function Home({ onChatCreated, theme, onScroll, userProfile }) {
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  // Keep ref in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamAgentName, setStreamAgentName] = useState('');
  const streamAgentRef = useRef('');
  const [chatId, setChatId] = useState(null);
  const chatIdRef = useRef(null);
  const navigatedFromStreamRef = useRef(false);
  const [userId] = useState(1);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const abortControllerRef = useRef(null);
  const streamingStartRef = useRef(null);
  const pendingWidgetRef = useRef(null);

  // ── Rotating greeting (Gemini-style) ──
  const greetings = {
    ru: [
      'Чем займемся?',
      'Всегда готов!',
      'Я всегда рядом 😌',
      'Обсудим идею? ☺️',
      'Привет! 👋',
    ],
    en: [
      'What shall we do?',
      'Always ready!',
      "I'm always here 😌",
      'Got an idea? ☺️',
      'Hello! 👋',
    ]
  };
  const [greetingIndex, setGreetingIndex] = useState(() => Math.floor(Math.random() * greetings[language].length));
  const [greetingVisible, setGreetingVisible] = useState(true);
  const greetingTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);

  // Set random greeting on mount and on new chat
  useEffect(() => {
    setGreetingVisible(false);
    const timer = setTimeout(() => {
      setGreetingIndex(Math.floor(Math.random() * greetings[language].length));
      setGreetingVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname === '/chat']);

  useEffect(() => {
    const startCycle = () => {
      greetingTimerRef.current = setInterval(() => {
        setGreetingVisible(false);
        fadeTimerRef.current = setTimeout(() => {
          setGreetingIndex(Math.floor(Math.random() * greetings[language].length));
          setGreetingVisible(true);
        }, 400);
      }, 900000); // 15 минут
    };
    startCycle();
    return () => {
      clearInterval(greetingTimerRef.current);
      clearTimeout(fadeTimerRef.current);
    };
  }, [language]);

  // Auto-send financial prompt if it was set from FinancialAnalyst page
  useEffect(() => {
    const prompt = sessionStorage.getItem('financialPrompt');
    if (prompt) {
      sessionStorage.removeItem('financialPrompt');
      // Немного отложим, чтобы компонент успел смонтироваться
      const timer = setTimeout(() => {
        handleSendMessage(prompt);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []); // Only on mount

  // Auto-scroll to bottom when messages or streaming content change
  useEffect(() => {
    // Check if we should scroll to top instead (e.g. navigation from Mentor)
    if (location.state?.scrollToTop) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = 0;
      }
      // Clear the state so subsequent auto-scrolls go to bottom
      window.history.replaceState({}, document.title);
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Track scroll in messages container
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (onScroll) {
        onScroll(container.scrollTop);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  // Keep ref in sync with state
  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  // Keep isStreamingRef in sync
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Load chat based on URL
  useEffect(() => {
    const loadChat = async () => {
      const pathMatch = location.pathname.match(/^\/chat\/(\d+)$/);
      
      if (pathMatch) {
        const id = parseInt(pathMatch[1]);

        // Если мы только что навигировались из onDone
        // (новый чат создан через стрим), НЕ очищаем сообщения,
        // потому что onDone уже вызвал setMessages.
        // НО всё равно перезагружаем из БД, чтобы гарантировать
        // что сообщения отобразятся (setMessages асинхронный,
        // может не успеть до вызова navigate).
        const skipClear = navigatedFromStreamRef.current;
        navigatedFromStreamRef.current = false;

        // Если стриминг ещё активен — не очищаем,
        // onDone добавит сообщение сам
        const skipClearStreaming = isStreamingRef.current;

        if (!skipClear && !skipClearStreaming) {
          setMessages([]);
        }
        setChatId(id);
        chatIdRef.current = id;
        await loadChatMessages(id);
      } else {
        setMessages([]);
        setChatId(null);
        chatIdRef.current = null;
      }
    };
    
    loadChat();
  }, [location.pathname]);

  const loadChatMessages = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/chats/${id}/messages`);
      const dbMessages = response.data;

      // Защита от race condition: если ID чата изменился с момента запроса,
      // игнорируем ответ — сообщения уже не актуальны
      if (chatIdRef.current !== id) {
        console.log(`Ignoring messages for chat ${id}, current chat is ${chatIdRef.current}`);
        return;
      }

      // Просто заменяем сообщения, так как мы уже очистили state перед вызовом
      setMessages(dbMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // ── Core AI streaming (does NOT add user message — assumes it's already in messages) ──
  const startAIStreaming = useCallback((message, currentMessages) => {
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    pendingWidgetRef.current = null;

    const currentChatId = chatIdRef.current;

    sendMessageStream(
      {
        user_id: userId,
        message: message,
        chat_id: currentChatId,
        history: currentMessages.map(m => ({ role: m.role, content: m.content, agent_name: m.agent_name })),
      },
      {
        onToken: (token) => setStreamingContent((prev) => prev + token),
        onWidget: (widgetContent) => {
          // Buffer widget content until done event
          pendingWidgetRef.current = widgetContent;
          setStreamingContent(widgetContent);
        },
        onDone: (metadata) => {
          setIsLoading(false);
          setIsStreaming(false);


          const finalContent = metadata.full_content || streamingContent;
          // Use agent_name from metadata or fallback to current ref
          const agentName = metadata.agent_name || streamAgentRef.current || 'ixteria';

          // If widget was received, use widget content
          const contentToSave = pendingWidgetRef.current || finalContent;

          // Avoid duplicate: check if the last message is already this content
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === contentToSave) {
              return prev;
            }
            return [...prev, { role: 'assistant', content: contentToSave, agent_name: agentName }];
          });
          setStreamingContent('');
          setStreamAgentName('');

          // Update chat ID if this is a new chat
          if (metadata.is_new_chat && metadata.chat_id) {
            setChatId(metadata.chat_id);
            chatIdRef.current = metadata.chat_id;
            // Signal that this navigation originated from a stream completion
            // so the pathname useEffect skips loadChatMessages and does NOT clear messages.
            navigatedFromStreamRef.current = true;
            navigate(`/chat/${metadata.chat_id}`, { replace: true });
            if (onChatCreated) {
              onChatCreated();
            }
          }
        },
        onError: (error) => {
          console.error('Failed to stream message:', error);
          setIsLoading(false);
          setIsStreaming(false);
          setStreamingContent('');
          setStreamAgentName('');
          setMessages((prev) => [...prev, { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте ещё раз.' }]);
        },
      }
    );
  }, [userId, navigate, onChatCreated]);

  // ── Send message with streaming (adds user message + starts AI) ──
  const handleSendMessage = useCallback((message) => {
    const userMessage = { role: 'user', content: message };
    setMessages((prev) => {
      const updated = [...prev, userMessage];
      // Запускаем стриминг после добавления сообщения
      // Используем setTimeout, чтобы setMessages успел примениться
      setTimeout(() => startAIStreaming(message, updated), 0);
      return updated;
    });
  }, [startAIStreaming]);

  // ═══ Gemini-style: optimistic message for photos (no AI start) ═══
  const handleOptimisticMessage = useCallback((message) => {
    setMessages((prev) => {
      const newMsg = { role: 'user', content: message };
      const updated = [...prev, newMsg];
      // Синхронно обновляем ref, чтобы handleFinalSend видел актуальную историю
      messagesRef.current = updated;
      return updated;
    });
  }, []);

  // ═══ Final send for photos: AI streaming only (message already shown) ═══
  const handleFinalSend = useCallback((message) => {
    // messagesRef.current уже содержит оптимистичное сообщение (добавлено handleOptimisticMessage)
    // Передаём как есть — AI получит актуальную историю без дублирования
    startAIStreaming(message, messagesRef.current);
  }, [startAIStreaming]);

  // ═══ Replace local blob URLs with server URLs after upload ═══
  const handleAttachmentsUploaded = useCallback((localUrls, uploadedAttachments) => {
    const urlMap = {};
    localUrls.forEach((localUrl, i) => {
      if (uploadedAttachments[i]?.url) {
        urlMap[localUrl] = uploadedAttachments[i].url;
      }
    });

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.role !== 'user') return msg;
        let parsed;
        try {
          parsed = JSON.parse(msg.content);
        } catch {
          return msg;
        }
        if (!parsed || typeof parsed !== 'object') return msg;

        // Replace attachment urls
        let changed = false;
        const newAttachments = (parsed.attachments || []).map((att) => {
          if (att._isLocal && urlMap[att.url]) {
            changed = true;
            return { ...att, url: urlMap[att.url], _isLocal: undefined };
          }
          return att;
        });

        if (!changed) return msg;

        // Also replace URLs in text
        let newText = parsed.text || '';
        Object.entries(urlMap).forEach(([localUrl, serverUrl]) => {
          newText = newText.split(localUrl).join(serverUrl);
        });

        return {
          ...msg,
          content: JSON.stringify({ text: newText, attachments: newAttachments }),
        };
      })
    );

    // Revoke blob URL'ов после замены
    localUrls.forEach(u => URL.revokeObjectURL(u));
  }, []);

  // ── Render a single message ──
  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const content = message.content;

    // Check if it's a widget
    if (!isUser && isWidgetContent(content)) {
      return (
        <div key={index} className="flex justify-start my-2">
          <ChatWidgetRenderer content={content} />
        </div>
      );
    }

    // ── Assistant message (no bubble, clean markdown) ──
    if (!isUser) {
      const agentName = message.agent_name || 'ixteria';
      const avatarSrc = getAgentAvatar(agentName);
      return (
        <div key={index} className="flex justify-start my-2 group">
          <div className="max-w-[85%] sm:max-w-[75%]">
            <div className="flex items-start gap-3">
              {/* AI Avatar indicator */}
              <div className="flex-shrink-0 mt-1">
                <img
                  src={avatarSrc}
                  alt={agentName}
                  className="w-8 h-8 rounded-full object-cover shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1 pt-1">
                {hasMarkdown(content) ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {content}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── User message (rounded bubble on right) ──
    // Parse user content — may be JSON with attachments or Markdown with images
    const userDisplayContent = parseUserMessageContent(content);
    
    // Detect if user message has images in attachments (for inline gallery under text)
    let userAttachments = [];
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.attachments)) {
          userAttachments = parsed.attachments.filter(a => {
            const type = (a.type || a.content_type || '').toLowerCase();
            const filename = (a.filename || a.name || '');
            const ext = filename.split('.').pop()?.toLowerCase();
            return type.startsWith('image/') || ['jpg','jpeg','png','webg','gif','bmp','heic','heif'].includes(ext);
          });
        }
      } catch {}
    }

    // If user message has images AND text is just a Markdown image, prefer raw attachments display
    const isOnlyImageMarkdown = userDisplayContent && /^!\[.*\]\(.*\)$/.test(userDisplayContent.trim());
    const hasTextContent = !!(userDisplayContent && !isOnlyImageMarkdown);

    // ── Images-only message: render inline gallery without bubble ──
    if (!hasTextContent && userAttachments.length > 0) {
      return (
        <div key={index} className="flex justify-end my-2 group">
          <div className="max-w-[85%] sm:max-w-[75%] flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap justify-end gap-2">
                {userAttachments.map((att, i) => {
                  const imgUrl = resolveUploadUrl(att.url || att.data_url || '');
                  return (
                    <img
                      key={i}
                      src={imgUrl}
                      alt={att.filename || 'attachment'}
                      className="max-h-80 max-w-full rounded-2xl shadow-md object-cover"
                      loading="lazy"
                    />
                  );
                })}
              </div>
            </div>
            {/* User avatar — real image if set, otherwise gradient fallback */}
            <div className="flex-shrink-0 mb-0.5">
              {userProfile?.avatar_url ? (
                <img
                  src={resolveUploadUrl(userProfile.avatar_url)}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.nextSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              {!userProfile?.avatar_url && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                  {userProfile?.first_name?.[0] || userProfile?.username?.[0] || '?'}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="flex justify-end my-2 group">
        <div className="max-w-[85%] sm:max-w-[75%] flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <div className="user-bubble bg-blue-500 dark:bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
              <div className="leading-relaxed space-y-2">
                {/* Text content — скрываем Markdown картинку, если показываем attachments отдельно */}
                {userDisplayContent && !isOnlyImageMarkdown && (
                  hasMarkdown(userDisplayContent) ? (
                    <MarkdownRenderer content={userDisplayContent} />
                  ) : (
                    <div className="whitespace-pre-wrap">{userDisplayContent}</div>
                  )
                )}
                
                {/* Image attachments inline gallery — only if also has text */}
                {userAttachments.length > 0 && hasTextContent && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {userAttachments.map((att, i) => {
                      const imgUrl = resolveUploadUrl(att.url || att.data_url || '');
                      return (
                        <img
                          key={i}
                          src={imgUrl}
                          alt={att.filename || 'attachment'}
                          className="max-w-full max-h-64 rounded-lg shadow-md object-cover"
                          loading="lazy"
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* User avatar — real image if set, otherwise gradient fallback */}
          <div className="flex-shrink-0 mb-0.5">
            {userProfile?.avatar_url ? (
              <img
                src={resolveUploadUrl(userProfile.avatar_url)}
                alt=""
                className="w-8 h-8 rounded-full object-cover shadow-sm"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.nextSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm"
              style={{
                display: userProfile?.avatar_url ? 'none' : 'flex',
              }}
            >
              <UserIcon size={16} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 animate-slide-in-left">
      {/* Messages Container — flex-1 + min-h-0 чтобы контент не выталкивал чат-инпут */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 z-10 pt-10 pb-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 select-none gap-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-500/10 dark:to-purple-500/10 rounded-full blur-xl" />
              <img
                src="/assets/icons/agents/ixteria.svg"
                alt="Ixteria"
                className="relative w-full h-full object-contain"
              />
            </div>
            <div className="h-auto flex items-center justify-center mt-0.5">
              <p
                className={`text-2xl sm:text-3xl font-semibold text-gray-700 dark:text-gray-300 transition-all duration-400 ${
                  greetingVisible
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-2 scale-95'
                }`}
              >
                {greetings[language][greetingIndex]}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col pt-4 pb-4 space-y-4">
            {messages.map((message, index) => renderMessage(message, index))}

            {/* ═══ Streaming AI Response ═══ */}
            {isStreaming && streamingContent && (
              <div className="flex justify-start my-2 group">
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <div className="flex items-start gap-3">
                    {/* AI Avatar */}
                    <div className="flex-shrink-0 mt-1">
                      <img
                        src={getAgentAvatar(streamAgentName || 'ixteria')}
                        alt={streamAgentName || 'ixteria'}
                        className="w-8 h-8 rounded-full object-cover shadow-sm"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    {/* Streaming content */}
                    <div className="min-w-0 flex-1 pt-1">
                      {isWidgetContent(streamingContent) ? (
                        <ChatWidgetRenderer content={streamingContent} />
                      ) : hasMarkdown(streamingContent) ? (
                        <MarkdownRenderer content={streamingContent} isStreaming={true} />
                      ) : (
                        <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {streamingContent}
                          <span className="inline-block w-1.5 h-4 bg-indigo-500 dark:bg-indigo-400 ml-0.5 rounded-sm animate-pulse" />
                        </div>
                      )}
                      {/* Cursor for markdown */}
                      {!isWidgetContent(streamingContent) && hasMarkdown(streamingContent) && (
                        <span className="inline-block w-1.5 h-4 bg-indigo-500 dark:bg-indigo-400 ml-0.5 rounded-sm animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ Loading dots when waiting for first token ═══ */}
            {isLoading && !streamingContent && (
              <div className="flex justify-start my-2">
                <div className="flex items-start gap-3 pl-11">
                  <div className="flex gap-1.5 py-2">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Footer - fixed/sticky снизу как в ChatGPT / Gemini */}
      <div className="sticky bottom-0 px-4 py-4 flex-shrink-0 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent">
        <ChatInput
          onSendMessage={(msg) => {
            // Set agent name based on last assistant message in history
            const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop();
            streamAgentRef.current = lastAssistantMsg?.agent_name || 'ixteria';
            setStreamAgentName(streamAgentRef.current);
            handleSendMessage(msg);
          }}
          onOptimisticMessage={handleOptimisticMessage}
          onAttachmentsUploaded={handleAttachmentsUploaded}
          onFinalSend={(msg) => {
            const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop();
            streamAgentRef.current = lastAssistantMsg?.agent_name || 'ixteria';
            setStreamAgentName(streamAgentRef.current);
            handleFinalSend(msg);
          }}
          disabled={isLoading || isStreaming}
          theme={theme}
        />
      </div>
    </div>
  );
}

export default App;