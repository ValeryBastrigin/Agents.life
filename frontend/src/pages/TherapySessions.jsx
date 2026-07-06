import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, Play, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const apiBase = process.env.REACT_APP_API_URL || '';

function getUserId() {
  try {
    return parseInt(localStorage.getItem('selectedUserId') || '1', 10);
  } catch {
    return 1;
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return `Сегодня, ${hours}:${minutes}`;
  if (d.toDateString() === yesterday.toDateString()) return `Вчера, ${hours}:${minutes}`;
  return `${day} ${month}, ${hours}:${minutes}`;
}

function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diff = Math.floor((end - start) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  if (mins > 0) return `${mins} мин ${secs} сек`;
  return `${secs} сек`;
}

export default function TherapySessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const userId = getUserId();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/api/user/${userId}/therapy-sessions`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data || []);
        }
      } catch (e) {
        console.error('Load sessions error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  const handleStartSession = () => {
    navigate('/psychologist', { state: { openSession: true } });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8">
      <div className="max-w-2xl mx-auto">
        {/* Hero header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-500 to-pink-600 dark:from-violet-700 dark:via-purple-600 dark:to-pink-700 rounded-[3.5rem] p-6 sm:p-8 mb-8 shadow-lg shadow-purple-500/20">
          <div className="relative z-10">
            <button onClick={() => navigate('/psychologist')} className="inline-flex items-center gap-1.5 text-white/80 hover:text-white mb-4 transition-colors">
              <ArrowLeft size={18} />
              <span className="text-sm">Назад к психологу</span>
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Heart size={26} className="text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Ваши сеансы терапий и итоги</h1>
            </div>
            <p className="text-white/80 text-sm">История ваших сеансов с психологом.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={32} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Сеансов нет</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              У вас пока не было сеансов с психологом. Начните первый сеанс прямо сейчас.
            </p>
            <button
              onClick={handleStartSession}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[2rem] bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium text-sm transition-all shadow-md"
            >
              <Play size={16} />
              Начните сеанс
            </button>
          </div>
        ) : (
          /* Session list */
          <div className="space-y-4">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-white dark:bg-surface-dark rounded-[3rem] overflow-hidden shadow-sm border border-gray-100 dark:border-transparent"
              >
                {/* Session header */}
                <button
                  onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    session.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    {session.status === 'active' ? (
                      <Clock size={18} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <CheckCircle size={18} className="text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">
                        Сеанс {index + 1}
                      </span>
                      {session.status === 'active' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                          Активен
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(session.started_at || session.created_at)}
                    </p>
                    {session.ended_at && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        Длительность: {formatDuration(session.started_at, session.ended_at)}
                      </p>
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center transition-transform ${
                    expandedId === session.id ? 'rotate-180' : ''
                  }`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </button>

                {/* Expanded summary */}
                {expandedId === session.id && (
                  <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-gray-800">
                    {session.summary ? (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {session.summary}
                        </p>
                      </div>
                    ) : session.status === 'active' ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          Сеанс ещё не завершён. Итоги появятся после его окончания.
                        </p>
                        <button
                          onClick={() => navigate('/psychologist', { state: { openSession: true } })}
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-[2rem] bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-medium hover:shadow-lg transition-all"
                        >
                          <Play size={14} />
                          Вернуться к сеансу
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                          Итоги не записаны.
                        </p>
                      </div>
                    )}

                    {/* Timing info */}
                    <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                      <span>🕐 Начало: {formatDate(session.started_at || session.created_at)}</span>
                      {session.ended_at && (
                        <span>✅ Окончание: {formatDate(session.ended_at)}</span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Start new session button — always visible if there are sessions */}
        {sessions.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleStartSession}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[2rem] bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium text-sm transition-all shadow-md"
            >
              <Play size={16} />
              Начать новый сеанс
            </button>
          </div>
        )}

        {/* Quote */}
        <div className="mt-8 bg-gradient-to-br from-purple-500/10 to-pink-600/10 dark:from-purple-500/5 dark:to-pink-600/5 rounded-[3rem] p-5 text-center border border-purple-200/30 dark:border-purple-700/30">
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            «Каждый сеанс — это шаг к пониманию себя. Даже маленький прогресс — это всё ещё прогресс.»
          </p>
        </div>
      </div>
    </div>
  );
}