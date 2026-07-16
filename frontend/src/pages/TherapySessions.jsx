import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Heart, Play, Clock, CheckCircle, Trash2, Target, Lightbulb,
  Smile, ListChecks, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { apiClient } from '../utils/apiClient';

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

// ─── Summary parser: extract sections from Markdown ─────────────────────────

const SECTION_ICONS = {
  'основная тема': { icon: Target, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  'тема': { icon: Target, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  'ключевые моменты': { icon: ListChecks, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'рекомендации': { icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  'эмоциональное состояние': { icon: Smile, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  'состояние': { icon: Smile, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  'эмоции': { icon: Smile, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  'вывод': { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  'итог': { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  'резюме': { icon: Heart, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
};

function parseSummarySections(summary) {
  if (!summary) return [];
  const cleaned = summary
    .replace(/^\*\*Резюме сеанса\*\*\s*/i, '')
    .replace(/^\*\*Саммери\*\*\s*/i, '')
    .trim();

  const sections = [];
  // Split by numbered items like "1. **Title:** ..." or "**Title:** ..."
  const lines = cleaned.split(/\n(?=\d+\.\s*\*\*|\*\*)/);

  for (const block of lines) {
    const match = block.match(/^(?:\d+\.\s*)?\*\*(.+?)\*\*[:\s—–-]*(.*)$/s);
    if (match) {
      const title = match[1].trim();
      const content = match[2]
        .trim()
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\*\*(.+?)\*\*/g, '«$1»');
      sections.push({ title, content });
    }
  }

  // If no structured sections found, return as one block
  if (sections.length === 0 && cleaned) {
    sections.push({ title: 'Резюме', content: cleaned });
  }

  return sections;
}

function getSectionMeta(title) {
  const lower = title.toLowerCase();
  for (const [key, meta] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return meta;
  }
  return { icon: Heart, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TherapySessions() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/user/${userId}/therapy-sessions`);
      setSessions(res.data || []);
    } catch (e) {
      console.error('Load sessions error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDelete = async (sessionId) => {
    setDeletingId(sessionId);
    try {
      await apiClient.delete(`/api/therapy-sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (expandedId === sessionId) setExpandedId(null);
    } catch (e) {
      console.error('Delete session error:', e);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleStartSession = () => {
    navigate('/psychologist', { state: { openSession: true } });
  };

  const renderSummaryContent = (session) => {
    if (!session.summary && session.status !== 'active') {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 dark:text-gray-500">Итоги не записаны.</p>
        </div>
      );
    }

    if (session.status === 'active') {
      return (
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
      );
    }

    const sections = parseSummarySections(session.summary);

    return (
      <div className="space-y-3">
        {sections.map((section, idx) => {
          const { icon: Icon, color, bg } = getSectionMeta(section.title);
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`${bg} rounded-[2rem] p-4`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={color} />
                </div>
                <h4 className={`text-sm font-semibold ${color}`}>{section.title}</h4>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap pl-1">
                {section.content}
              </p>
            </motion.div>
          );
        })}
      </div>
    );
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
              <Heart size={32} className="text-purple-400" />
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
            <AnimatePresence>
              {sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="bg-white dark:bg-surface-dark rounded-[3rem] shadow-sm border border-gray-100 dark:border-transparent relative group"
                >
                  {/* Delete button — top right */}
                  {/* Delete button — on top of the card */}
                  <div className="absolute -top-3 -right-3 z-20">
                    {confirmDeleteId === session.id ? (
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 rounded-full px-3 py-1.5 shadow-lg border border-red-200 dark:border-red-800">
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">Удалить?</span>
                        <button
                          onClick={() => handleDelete(session.id)}
                          disabled={deletingId === session.id}
                          className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {deletingId === session.id ? '...' : 'Да'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                          Нет
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(session.id);
                        }}
                        className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40"
                        title="Удалить сеанс"
                      >
                        <Trash2 size={16} className="text-white" />
                      </button>
                    )}
                  </div>

                  {/* Session header */}
                  <button
                    onClick={() => {
                      setConfirmDeleteId(null);
                      setExpandedId(expandedId === session.id ? null : session.id);
                    }}
                    className="w-full px-5 py-4 pr-14 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
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
                          Сеанс {sessions.length - index}
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
                  <AnimatePresence>
                    {expandedId === session.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-gray-800">
                          {renderSummaryContent(session)}

                          {/* Timing info */}
                          <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-gray-400 dark:text-gray-500">
                            <span>🕐 {formatDate(session.started_at || session.created_at)}</span>
                            {session.ended_at && (
                              <span>✅ {formatDate(session.ended_at)}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Start new session button */}
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