import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import AnimatedBackground from './components/AnimatedBackground';
import ChatWidgetRenderer from './components/ui/widgets/ChatWidgetRenderer';
import MarkdownRenderer from './components/MarkdownRenderer';
import { User, Menu, ArrowLeft, Bot, User as UserIcon } from 'lucide-react';
import Secretary from './pages/Secretary';
import Accountant from './pages/Accountant';
import Dietitian from './pages/Dietitian';
import Psychologist from './pages/Psychologist';
import Mentor from './pages/Mentor';
import Profile from './pages/Profile';
import ActivityLog from './pages/ActivityLog';
import SecretaryGuide from './pages/SecretaryGuide';
import NotesList from './pages/NotesList';
import NoteEditor from './pages/NoteEditor';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import axios from 'axios';
import { sendMessageStream } from './utils/apiClient';

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

  // Load user chats on mount
  useEffect(() => {
    loadChats();
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
      {location.pathname !== '/profile' && location.pathname !== '/secretary/logs' && !location.pathname.startsWith('/secretary/notes') && (
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 flex-shrink-0 bg-transparent">
        <div className="flex items-center gap-3">
          <span className={`px-1 py-1 rounded-full transition-all duration-300 ${headerSolid ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl' : 'bg-transparent'}`}>
          {(location.pathname === '/secretary' || location.pathname === '/accountant' || location.pathname === '/dietitian' || location.pathname === '/psychologist' || location.pathname === '/mentor') ? (
            <button
              onClick={() => navigate('/chat')}
              className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-full transition-colors"
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
          </span>
          <span className={`px-3 py-1.5 rounded-full transition-all duration-300 ${headerSolid ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl' : 'bg-transparent'}`}>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {location.pathname === '/chat' ? (
              <>
                Ixteria
                <img src="/assets/icons/agents/ixteria.svg" alt="Ixteria" className="w-6 h-6 rounded-full" />
              </>
            ) :
              location.pathname === '/secretary' ? 'Тайм-Менеджер' :
              location.pathname === '/secretary/logs' ? 'Тайм-Менеджер' :
              location.pathname === '/accountant' ? 'Финансовый-помощник' :
             location.pathname === '/dietitian' ? 'Диетолог' :
             location.pathname === '/psychologist' ? 'Психолог' :
             location.pathname === '/mentor' ? 'Ментор' : 
             <>
                Ixteria
                <img src="/assets/icons/agents/ixteria.svg" alt="Ixteria" className="w-6 h-6 rounded-full" />
              </>}
          </h1>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-1 py-1 rounded-full transition-all duration-300 ${headerSolid ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl' : 'bg-transparent'}`}>
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
        <Route path="/secretary/guide" element={<SecretaryGuide />} />
        <Route path="/secretary/notes" element={<NotesList />} />
        <Route path="/secretary/notes/:id" element={<NoteEditor />} />
        <Route path="/accountant" element={<Accountant />} />
        <Route path="/dietitian" element={<Dietitian />} />
        <Route path="/psychologist" element={<Psychologist />} />
        <Route path="/mentor" element={<Mentor />} />
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
    return parsed && typeof parsed === 'object' && ['schedule', 'event_created', 'note_created', 'food_log'].includes(parsed.type);
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
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamAgentName, setStreamAgentName] = useState('');
  const streamAgentRef = useRef('');
  const [chatId, setChatId] = useState(null);
  const chatIdRef = useRef(null);
  const [userId] = useState(1);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const abortControllerRef = useRef(null);
  const streamingStartRef = useRef(null);
  const pendingWidgetRef = useRef(null);

  // Auto-scroll to bottom when messages or streaming content change
  useEffect(() => {
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

  // Load chat based on URL
  useEffect(() => {
    const loadChat = async () => {
      const pathMatch = location.pathname.match(/^\/chat\/(\d+)$/);
      
      if (pathMatch) {
        const id = parseInt(pathMatch[1]);
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
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // ── Send message with streaming ──
  const handleSendMessage = useCallback((message) => {
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    pendingWidgetRef.current = null;

    const userMessage = { role: 'user', content: message };
    const currentChatId = chatIdRef.current;

    setMessages((prev) => [...prev, userMessage]);

    sendMessageStream(
      {
        user_id: userId,
        message: message,
        chat_id: currentChatId,
        history: messages.map(m => ({ role: m.role, content: m.content, agent_name: m.agent_name })),
      },
      {
        onToken: (token) => {
          setStreamingContent((prev) => prev + token);
        },
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

          setMessages((prev) => [...prev, { role: 'assistant', content: contentToSave, agent_name: agentName }]);
          setStreamingContent('');
          setStreamAgentName('');

          // Update chat ID if this is a new chat
          if (metadata.is_new_chat && metadata.chat_id) {
            setChatId(metadata.chat_id);
            chatIdRef.current = metadata.chat_id;
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
  }, [userId, messages, navigate, onChatCreated]);

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
            return type.startsWith('image/') || ['jpg','jpeg','png','webp','gif','bmp','heic','heif'].includes(ext);
          });
        }
      } catch {}
    }

    // If user message has images AND text is just a Markdown image, prefer raw attachments display
    const isOnlyImageMarkdown = userDisplayContent && /^!\[.*\]\(.*\)$/.test(userDisplayContent.trim());

    return (
      <div key={index} className="flex justify-end my-2 group">
        <div className="max-w-[85%] sm:max-w-[75%] flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <div className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
              <div className="leading-relaxed space-y-2">
                {/* Text content — скрываем Markdown картинку, если показываем attachments отдельно */}
                {userDisplayContent && !isOnlyImageMarkdown && (
                  hasMarkdown(userDisplayContent) ? (
                    <MarkdownRenderer content={userDisplayContent} />
                  ) : (
                    <div className="whitespace-pre-wrap">{userDisplayContent}</div>
                  )
                )}
                
                {/* Image attachments inline gallery */}
                {userAttachments.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${isOnlyImageMarkdown ? '' : 'mt-2'}`}>
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
    <div className="flex flex-col h-full relative animate-slide-in-left">
      {/* Messages Container */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 relative z-10 pb-0 -mb-2">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 select-none">
            <img src="/assets/icons/agents/ixteria.svg" alt="Ixteria" className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">
              {t('chatWithAgents')}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col pt-20 pb-4 space-y-4">
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

      {/* Chat Input Footer - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-4 relative z-20 bg-transparent">
        <ChatInput
          onSendMessage={(msg) => {
            // Set agent name based on last assistant message in history
            const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop();
            streamAgentRef.current = lastAssistantMsg?.agent_name || 'ixteria';
            setStreamAgentName(streamAgentRef.current);
            handleSendMessage(msg);
          }}
          disabled={isLoading || isStreaming}
          theme={theme}
        />
      </div>
    </div>
  );
}

export default App;