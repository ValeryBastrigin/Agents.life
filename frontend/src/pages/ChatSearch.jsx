import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, MessageSquare, Pin, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import AnimatedBackground from '../components/AnimatedBackground';

const API_URL = 'http://localhost:8001';

// Helper to strip markdown asterisks and symbols for clean text display
const cleanMessageText = (text) => {
  if (!text) return '';
  // Remove JSON string wrappers or object structures if present
  let clean = text;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      clean = parsed.text || JSON.stringify(parsed);
    }
  } catch {}

  return clean
    .replace(/[*_#`~>]/g, '') // remove markdown symbols like *, _, #, `, ~, >
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // convert markdown links to plain text
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();
};

const ChatSearch = ({ userId, theme }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const handleSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setSearched(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setSearched(true);
      try {
        const response = await axios.get(`${API_URL}/api/chats/search`, {
          params: { user_id: userId, q: query.trim() }
        });
        setResults(response.data || []);
      } catch (error) {
        console.error('Failed to search chats:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, userId]);

  const handleSelectChat = (chatId) => {
    navigate(`/chat/${chatId}`);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-100 flex flex-col relative overflow-y-auto">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <AnimatedBackground theme={theme} isLoading={false} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-transparent px-4 py-4 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-full transition-colors z-10"
            title={language === 'ru' ? 'Назад' : 'Back'}
          >
            <ArrowLeft size={22} className="text-gray-700 dark:text-gray-200" />
          </button>
          
          <div className="relative flex-1 z-10">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={language === 'ru' ? 'Поиск по вашим чатам и сообщениям...' : 'Search chats and messages...'}
              className="w-full pl-12 pr-12 py-3 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-full border border-gray-200/40 dark:border-gray-700/40 focus:outline-none focus:ring-2 focus:ring-primary-500 text-base shadow-sm text-gray-800 dark:text-white placeholder-gray-400"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-500 animate-spin" size={20} />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 z-10 pb-20">
        {!searched ? (
          <div className="text-center py-20 text-gray-400">
            <Search size={48} className="mx-auto mb-4 opacity-40" />
            <h2 className="text-xl font-semibold mb-2">
              {language === 'ru' ? 'Поиск по чатам' : 'Chat Search'}
            </h2>
            <p className="text-sm max-w-md mx-auto">
              {language === 'ru'
                ? 'Введите слово или фразу для поиска во всех ваших диалогах и сообщениях с ИИ-агентами.'
                : 'Enter a word or phrase to search across all your chats and messages with AI agents.'}
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 mx-auto text-primary-500 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">{language === 'ru' ? 'Ищем по вашим чатам...' : 'Searching chats...'}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-1">
              {language === 'ru' ? 'Ничего не найдено' : 'No results found'}
            </h3>
            <p className="text-sm">
              {language === 'ru'
                ? `По запросу "${query}" ничего не обнаружено в ваших чатах.`
                : `No matches found for "${query}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
              {language === 'ru' ? `Найдено чатов: ${results.length}` : `Found chats: ${results.length}`}
            </div>

            {results.map((res) => (
              <div
                key={res.chat_id}
                onClick={() => handleSelectChat(res.chat_id)}
                className="bg-surface-light/70 dark:bg-surface-dark/70 backdrop-blur-xl border border-gray-200/40 dark:border-gray-700/40 rounded-2xl p-5 hover:border-primary-500/50 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary-500/10 text-primary-500 rounded-xl group-hover:scale-105 transition-transform">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        {cleanMessageText(res.chat_title)}
                        {res.is_pinned && (
                          <Pin size={14} className="text-primary-500 fill-current rotate-45" />
                        )}
                      </h3>
                      <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                        <span className="capitalize px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md">
                          {res.agent_name}
                        </span>
                        {res.updated_at && (
                          <span>
                            {new Date(res.updated_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matching messages excerpt */}
                {res.matching_messages && res.matching_messages.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-primary-500/30 space-y-2">
                    {res.matching_messages.map((msg) => (
                      <div key={msg.id} className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="text-xs font-medium text-primary-500 uppercase mr-2">
                          {msg.role === 'user' ? (language === 'ru' ? 'Вы' : 'You') : 'AI'}:
                        </span>
                        <span>{cleanMessageText(msg.content)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatSearch;
