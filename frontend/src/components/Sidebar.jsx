import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, MoreVertical, Share, Pin, PinOff, Edit, Trash2, Settings } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import AgentManagerModal from './AgentManagerModal';

const API_URL = 'http://localhost:8001';

const floatAnimations = [
  { animationDelay: '0s' },
  { animationDelay: '0.4s' },
  { animationDelay: '0.8s' },
  { animationDelay: '1.2s' },
  { animationDelay: '1.6s' },
];

const Sidebar = ({ isOpen, onClose, theme, chats, onSelectChat, onNewChat, onDeleteChat, onRenameChat, onPinChat }) => {
  const { t, language } = useLanguage();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [chatOptions, setChatOptions] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [agentManagerOpen, setAgentManagerOpen] = useState(false);
  const [enabledAgents, setEnabledAgents] = useState(['secretary', 'accountant', 'dietitian', 'psychologist', 'mentor']);
  const menuButtonRef = useRef(null);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (e) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const allMenuItems = [
    { 
      id: 'secretary', 
      name: t('secretary'), 
      iconSrc: '/assets/icons/agents/секретарь.png',
      path: '/secretary', 
      description: t('secretaryDesc'),
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      id: 'dietitian', 
      name: 'Диетолог', 
      iconSrc: '/assets/icons/agents/диетолог.png',
      path: '/dietitian', 
      description: 'Питание, диета, калории и здоровый рацион',
      gradient: 'from-green-400 to-teal-500'
    },
    { 
      id: 'accountant', 
      name: t('accountant'), 
      iconSrc: '/assets/icons/agents/финансовый ассистент.png',
      path: '/accountant', 
      description: t('accountantDesc'),
      gradient: 'from-green-500 to-emerald-500'
    },
    { 
      id: 'psychologist', 
      name: 'Психолог', 
      iconSrc: '/assets/icons/agents/психолог.png',
      path: '/psychologist', 
      description: 'Эмоциональная поддержка, практики и ментальное здоровье',
      gradient: 'from-purple-400 to-indigo-500'
    },
    { 
      id: 'mentor', 
      name: 'Ментор', 
      iconSrc: '/assets/icons/agents/ментор.png',
      path: '/mentor', 
      description: 'Цели, развитие, карьера и мотивация',
      gradient: 'from-amber-400 to-orange-500'
    },
  ];

  // Filter menu items based on enabled agents
  const menuItems = allMenuItems.filter(item => enabledAgents.includes(item.id));

  const handleDeleteClick = (e, chatId) => {
    e.stopPropagation();
    setDeleteConfirm(chatId);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm) {
      try {
        await axios.delete(`${API_URL}/api/chats/${deleteConfirm}`);
        if (onDeleteChat) {
          onDeleteChat(deleteConfirm);
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
      }
      setDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleChatOptions = (e, chatId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.top,
      left: rect.right + 8
    });
    setChatOptions(chatId);
  };

  const handleRenameClick = (chatId, currentTitle) => {
    setChatOptions(null);
    setRenameModal(chatId);
    setNewTitle(currentTitle);
  };

  const handleRenameSubmit = async () => {
    if (renameModal && newTitle.trim()) {
      await onRenameChat(renameModal, newTitle.trim());
      setRenameModal(null);
      setNewTitle('');
    }
  };

  const handlePinToggle = async (chatId) => {
    await onPinChat(chatId);
    setChatOptions(null);
  };

  const handleLongPress = (chatId) => {
    setChatOptions(chatId);
  };

  let longPressTimer;
  const handleTouchStart = (e, chatId) => {
    longPressTimer = setTimeout(() => handleLongPress(chatId), 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer);
  };

  return (
    <>
      <style>{`
        @keyframes agent-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-2deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-2px) rotate(1deg); }
        }
        .agent-icon {
          animation: agent-float 3s ease-in-out infinite;
        }
        .agent-icon:hover {
          animation-duration: 0.6s;
        }
      `}</style>
      {/* Overlay backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-72 bg-background-light dark:bg-background-dark z-50 shadow-2xl transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Agents List */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Agents Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('agents')}
                </h3>
                <button
                  onClick={() => setAgentManagerOpen(true)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={language === 'ru' ? 'Управление агентами' : 'Manage Agents'}
                >
                  <Settings size={22} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              {menuItems.map((item, index) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-[2rem] mb-2 transition-all hover:scale-[1.02] hover:shadow-lg text-gray-700 dark:text-gray-300 group bg-surface-light dark:bg-surface-dark/60 border border-gray-200/50 dark:border-gray-700/40"
                >
                  <img src={item.iconSrc} alt={item.name} className="w-24 h-24 object-contain shrink-0 agent-icon" style={{ animationDelay: floatAnimations[index % floatAnimations.length].animationDelay }} />
                  <div className="text-left flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {item.description}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Chats Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('yourChats')}
                </h3>
                <button
                  onClick={() => {
                    onNewChat();
                    onClose();
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Plus size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              {chats && chats.length > 0 ? (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      onSelectChat(chat.id);
                      onClose();
                    }}
                    onTouchStart={(e) => handleTouchStart(e, chat.id)}
                    onTouchEnd={handleTouchEnd}
                    className="w-full flex items-center gap-3 p-3 rounded-[2rem] mb-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-left group relative"
                  >
                    <MessageSquare size={18} className="text-gray-500 dark:text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{chat.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(chat.created_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <button
                      ref={menuButtonRef}
                      onClick={(e) => handleChatOptions(e, chat.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
                    >
                      <MoreVertical size={14} className="text-gray-400" />
                    </button>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  {t('noChats')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Manager Modal */}
      {agentManagerOpen && (
        <AgentManagerModal
          onClose={() => setAgentManagerOpen(false)}
          onAgentsChange={(activeIds) => setEnabledAgents(activeIds)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background-light dark:bg-background-dark rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              {t('deleteChat')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('deleteChatConfirm')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 rounded-[2rem] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 rounded-[2rem] bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Options - Desktop Context Menu */}
      {chatOptions && !isMobile && (
        <>
          <div
            className="fixed inset-0 bg-transparent z-50"
            onClick={() => setChatOptions(null)}
          />
          <div
            className={`fixed ${theme === 'dark' ? 'bg-background-dark' : 'bg-white'} backdrop-blur-xl rounded-[2rem] shadow-2xl border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200/50'} z-50 min-w-[200px]`}
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`
            }}
          >
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  // Share functionality
                  setChatOptions(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${theme === 'dark' ? 'hover:bg-surface-dark text-gray-200' : 'hover:bg-gray-100 text-gray-800'} transition-colors`}
              >
                <Share size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                <span className="text-sm">{t('share')}</span>
              </button>
              <button
                onClick={() => handlePinToggle(chatOptions)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${theme === 'dark' ? 'hover:bg-surface-dark text-gray-200' : 'hover:bg-gray-100 text-gray-800'} transition-colors`}
              >
                {chats.find(c => c.id === chatOptions)?.is_pinned ? (
                  <PinOff size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                ) : (
                  <Pin size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                )}
                <span className="text-sm">{chats.find(c => c.id === chatOptions)?.is_pinned ? t('unpin') : t('pin')}</span>
              </button>
              <button
                onClick={() => handleRenameClick(chatOptions, chats.find(c => c.id === chatOptions)?.title)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${theme === 'dark' ? 'hover:bg-surface-dark text-gray-200' : 'hover:bg-gray-100 text-gray-800'} transition-colors`}
              >
                <Edit size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                <span className="text-sm">{t('rename')}</span>
              </button>
              <div className={`h-px ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'} my-1`} />
              <button
                onClick={() => {
                  setChatOptions(null);
                  setDeleteConfirm(chatOptions);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
              >
                <Trash2 size={18} />
                <span className="text-sm">{t('deleteChatOption')}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Chat Options - Mobile Bottom Sheet */}
      {chatOptions && isMobile && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setChatOptions(null)}
          />
          <div className={`fixed bottom-0 left-0 right-0 ${theme === 'dark' ? 'bg-background-dark' : 'bg-white'} rounded-t-3xl z-50 transform transition-transform duration-300 ease-out shadow-2xl`}>
            {/* Drag indicator */}
            <div className="flex justify-center pt-3 pb-2">
              <div className={`w-12 h-1.5 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded-full`} />
            </div>

            <div className="p-4 space-y-1">
              <button
                onClick={() => {
                  // Share functionality
                  setChatOptions(null);
                }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-[2rem] ${theme === 'dark' ? 'hover:bg-surface-dark text-gray-200' : 'hover:bg-gray-100 text-gray-800'} transition-colors`}
              >
                <Share size={22} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                <span className="text-base font-medium">{t('share')}</span>
              </button>
              <button
                onClick={() => handlePinToggle(chatOptions)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-[2rem] ${theme === 'dark' ? 'hover:bg-surface-dark text-gray-200' : 'hover:bg-gray-100 text-gray-800'} transition-colors`}
              >
                {chats.find(c => c.id === chatOptions)?.is_pinned ? (
                  <PinOff size={22} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                ) : (
                  <Pin size={22} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                )}
                <span className="text-base font-medium">{chats.find(c => c.id === chatOptions)?.is_pinned ? t('unpin') : t('pin')}</span>
              </button>
              <button
                onClick={() => handleRenameClick(chatOptions, chats.find(c => c.id === chatOptions)?.title)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-[2rem] ${theme === 'dark' ? 'hover:bg-surface-dark text-gray-200' : 'hover:bg-gray-100 text-gray-800'} transition-colors`}
              >
                <Edit size={22} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                <span className="text-base font-medium">{t('rename')}</span>
              </button>
              <div className={`h-px ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} my-2`} />
              <button
                onClick={() => {
                  setChatOptions(null);
                  setDeleteConfirm(chatOptions);
                }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-[2rem] hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
              >
                <Trash2 size={22} />
                <span className="text-base font-medium">{t('deleteChatOption')}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background-light dark:bg-background-dark rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {t('renameChat')}
            </h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('enterNewTitle')}
              className="w-full p-3 rounded-[2rem] border border-gray-300 bg-surface-light dark:bg-surface-dark text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRenameModal(null);
                  setNewTitle('');
                }}
                className="flex-1 px-4 py-2 rounded-[2rem] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRenameSubmit}
                className="flex-1 px-4 py-2 rounded-[2rem] bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;