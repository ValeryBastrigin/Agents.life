import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const apiBase = process.env.REACT_APP_API_URL || '';

function getUserId() {
  try {
    return parseInt(localStorage.getItem('selectedUserId') || '1', 10);
  } catch {
    return 1;
  }
}

export default function TherapySessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = getUserId();

  useEffect(() => {
    // Загружаем список сеансов (заглушка — пока сеансов нет)
    async function load() {
      try {
        setLoading(true);
        // В будущем здесь будет запрос к /api/user/:userId/sessions
        // пока оставляем пустой массив
        setSessions([]);
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
          /* Session list — появится, когда будут реальные сеансы */
          <div className="space-y-4">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-surface-dark rounded-[3rem] p-5 shadow-sm border border-gray-100 dark:border-transparent hover:shadow-md transition-shadow"
              >
                {/* Здесь будет рендер реальных сеансов */}
                <p className="text-gray-600 dark:text-gray-400">{session.title}</p>
              </motion.div>
            ))}
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
