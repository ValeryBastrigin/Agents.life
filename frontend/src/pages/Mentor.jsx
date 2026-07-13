import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, BookOpen, Calendar, Zap, Sparkles, Plus, MessageSquare, GitBranch, CheckCircle2, Wand2, X } from 'lucide-react';
import MentorBackground from '../components/MentorBackground';
import DreamInputModal from '../components/DreamInputModal';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const STORAGE_KEY = 'habit_tracker_data';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadHabitData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { habits: [], xp: 0, level: 1, unlockedAchievements: [], lastResetDate: getTodayKey() };
}

const categoryEmojis = {
  MATERIAL_ASSET: '💰',
  SKILL_DEVELOPMENT: '📚',
  CAREER_GROWTH: '🚀',
  LIFE_EXPERIENCE: '🌍',
  EXISTENTIAL_WELLBEING: '🧘',
  ABSTRACT_AMBITION: '✨'
};

const categoryLabels = {
  MATERIAL_ASSET: 'Материальная цель',
  SKILL_DEVELOPMENT: 'Развитие навыков',
  CAREER_GROWTH: 'Карьерный рост',
  LIFE_EXPERIENCE: 'Жизненный опыт',
  EXISTENTIAL_WELLBEING: 'Благополучие',
  ABSTRACT_AMBITION: 'Амбиция'
};

const Mentor = () => {
  const navigate = useNavigate();
  const [habitData, setHabitData] = useState({ habits: [], xp: 0, level: 1, unlockedAchievements: [] });
  const [dreamModalOpen, setDreamModalOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { goal_id, goal_summary }

  // Load dream goals from backend
  const loadDreamGoals = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/mentor/dream-goals?user_id=1`);
      if (res.data?.goals) {
        setGoals(res.data.goals.filter(g => g.status === 'active' || g.status === 'saved'));
      }
    } catch (err) {
      console.error('Failed to load dream goals:', err);
    }
  }, []);

  useEffect(() => {
    loadDreamGoals();
  }, [loadDreamGoals]);

  const handleDeleteGoal = async (goalId) => {
    try {
      await axios.delete(`${API_URL}/api/mentor/dream-goals/${goalId}?user_id=1`);
      loadDreamGoals();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
    setDeleteConfirm(null);
  };

  // Reload goals when dream modal closes
  useEffect(() => {
    if (!dreamModalOpen) {
      loadDreamGoals();
    }
  }, [dreamModalOpen, loadDreamGoals]);

  const toggleHabitComplete = (habitId) => {
    const data = loadHabitData();
    const todayKey = getTodayKey();
    const idx = data.habits.findIndex(h => h.id === habitId);
    if (idx === -1) return;
    const habit = data.habits[idx];
    if (!habit.log) habit.log = {};
    if (habit.log[todayKey]) {
      delete habit.log[todayKey];
      data.xp = Math.max(0, (data.xp || 0) - 10);
      data.level = Math.floor(data.xp / 100) + 1;
    } else {
      habit.log[todayKey] = true;
      data.xp = (data.xp || 0) + 10;
      const newLevel = Math.floor(data.xp / 100) + 1;
      if (newLevel > (data.level || 1)) {
        data.level = newLevel;
      }
    }
    data.habits[idx] = habit;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setHabitData(data);
  };

  useEffect(() => {
    setHabitData(loadHabitData());
    const handleStorage = () => setHabitData(loadHabitData());
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => setHabitData(loadHabitData()), 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const todayKey = getTodayKey();
  const habits = useMemo(() => {
    return habitData.habits.map(h => {
      const log = h.log || {};
      const history = h.history || [todayKey];
      let streak = 0;
      const d = new Date();
      while (true) {
        const key = d.toISOString().slice(0, 10);
        if (history.includes(key) || log[key]) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      return {
        ...h,
        streak,
        doneToday: !!(log[todayKey] || (h.history && h.history.includes(todayKey))),
      };
    });
  }, [habitData, todayKey]);

  return (
    <div className="flex-1 relative overflow-hidden">
      <MentorBackground />
      <div className="relative z-10 overflow-y-auto h-full px-6 pt-4 pb-8">
        <div className="max-w-2xl mx-auto">

          {/* Dream button — replaces "Путь к успеху" widget */}
          <button
            onClick={() => setDreamModalOpen(true)}
            className="w-full bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 rounded-[3rem] p-5 mb-6 text-white hover:shadow-2xl hover:shadow-amber-500/30 transition-all active:scale-[0.98] text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-all group-hover:scale-110 duration-300">
                <Wand2 size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold mb-1">На пути к мечте</h2>
                <p className="text-white/80 text-xs leading-relaxed">
                  Расскажите ментору о своей мечте и он проложит понятный путь к ней и будет поддерживать вас на всем пути.
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-all group-hover:scale-110 duration-300">
                <Sparkles size={20} className="text-white" />
              </div>
            </div>
          </button>

          {/* 3 Horizontal Blocks */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button className="flex flex-col items-center justify-center gap-2 bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all aspect-square shadow-sm border border-gray-200 dark:border-transparent backdrop-blur-lg group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all">
                <BookOpen size={20} className="text-white" />
              </div>
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                Как пользоваться ментором?
              </span>
            </button>

            <button onClick={async () => {
              try {
                const res = await axios.post(`${API_URL}/api/chats`, {
                  user_id: 1,
                  agent_type: 'mentor',
                  welcome_message: 'Привет! 👋 Я — ваш ментор. Чем я могу помочь вам сегодня? Расскажите о своих целях, планах или задайте любой вопрос о развитии и самореализации.'
                });
                const chatId = res.data.chat_id || res.data.id;
                navigate(`/chat/${chatId}`);
              } catch (err) {
                console.error('Failed to create mentor chat:', err);
              }
            }} className="flex flex-col items-center justify-center gap-2 bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all aspect-square shadow-sm border border-gray-200 dark:border-transparent backdrop-blur-lg group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all">
                <MessageSquare size={20} className="text-white" />
              </div>
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                Чат с ментором
              </span>
            </button>

            <button onClick={() => navigate('/mentor/tree')} className="flex flex-col items-center justify-center gap-2 bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all aspect-square shadow-sm border border-gray-200 dark:border-transparent backdrop-blur-lg group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all">
                <GitBranch size={20} className="text-white" />
              </div>
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                Дерево развития
              </span>
            </button>
          </div>

          {/* Active Goals — loaded from dream goals API */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Target size={18} className="text-red-500" />
              Активные цели
            </h2>
            {goals.length === 0 ? (
              <div className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-6 text-center backdrop-blur-lg border border-gray-200 dark:border-transparent">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Target size={20} className="text-red-400 dark:text-red-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Нет активных целей
                </p>
                <button
                  onClick={() => setDreamModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-[2rem] text-sm font-medium transition-all shadow-md hover:shadow-xl"
                >
                  <Plus size={16} />
                  Добавить цели
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {goals.map((goal) => (
                  <div
                    key={goal.goal_id}
                    className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all group backdrop-blur-lg border border-gray-200 dark:border-transparent"
                  >
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(goal); }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-red-500 dark:hover:bg-red-500 text-gray-500 dark:text-gray-300 hover:text-white flex items-center justify-center transition-all z-10"
                        title="Удалить"
                      >
                        <X size={14} />
                      </button>
                      <div className="w-10 h-10 rounded-[3rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg mb-2 shadow-md group-hover:shadow-xl transition-all">
                        {categoryEmojis[goal.category] || '🎯'}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-0.5">
                      {goal.goal_summary || 'Мечта'}
                    </h3>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">
                      {categoryLabels[goal.category] || goal.category}
                    </p>
                    {goal.analysis && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 italic line-clamp-2 mb-2">
                        {goal.analysis}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Calendar size={10} />
                      <span>Создано: {goal.created_at ? new Date(goal.created_at).toLocaleDateString() : 'сегодня'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Habits Tracker — add habit widget */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                Трекер привычек
              </h2>
            </div>
            <button onClick={() => navigate('/mentor/habits')} className="w-full flex items-center justify-center gap-3 p-5 bg-white/95 dark:bg-surface-dark rounded-[3rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-all group border-2 border-dashed border-gray-300 dark:border-gray-600 backdrop-blur-lg mb-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all">
                <Plus size={22} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white">Добавьте полезные привычки, уберите вредные</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Начните формировать новые привычки уже сегодня</p>
              </div>
            </button>
            {habits.length > 0 && (
              <>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 bg-white/95 dark:bg-surface-dark rounded-[2rem] px-4 py-2.5 text-center backdrop-blur-lg">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{habits.filter(h => h.doneToday).length}/{habits.length}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">выполнено сегодня</div>
                  </div>
                  <div className="flex-1 bg-white/95 dark:bg-surface-dark rounded-[2rem] px-4 py-2.5 text-center backdrop-blur-lg">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{habitData.level}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">уровень</div>
                  </div>
                  <div className="flex-1 bg-white/95 dark:bg-surface-dark rounded-[2rem] px-4 py-2.5 text-center backdrop-blur-lg">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{habitData.xp} XP</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">опыт</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {habits.map((habit, index) => (
                    <label
                      key={index}
                      className={`flex items-center gap-3 px-4 py-3 bg-white/95 dark:bg-surface-dark rounded-[2rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-all cursor-pointer select-none backdrop-blur-lg ${habit.doneToday ? 'ring-2 ring-green-400 dark:ring-green-500' : ''}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                          habit.doneToday
                            ? habit.type === 'bad'
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-green-500 border-green-500 text-white'
                            : habit.type === 'bad'
                              ? 'border-red-400 dark:border-red-500'
                              : 'border-green-400 dark:border-green-500'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleHabitComplete(habit.id);
                        }}
                      >
                        {habit.doneToday ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full opacity-0 group-hover:opacity-30 bg-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">{habit.icon}</span>
                        <span className={`text-sm font-medium truncate ${habit.type === 'bad' ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                          {habit.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs">🔥</span>
                        <span className="text-sm font-bold text-amber-500">{habit.streak}</span>
                        <span className="text-[10px] text-gray-400">дн</span>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recommended Materials — empty placeholder */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-500" />
              Рекомендованные материалы
            </h2>
            <div className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-6 text-center backdrop-blur-lg border border-gray-200 dark:border-transparent">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <BookOpen size={20} className="text-indigo-400 dark:text-indigo-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Подбор материалов будет происходить умным образом
              </p>
            </div>
          </div>

        {/* Dream Input Modal */}
        <DreamInputModal
          isOpen={dreamModalOpen}
          onClose={() => setDreamModalOpen(false)}
        />

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <X size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white text-center mb-2">
                Удалить цель?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Вы уверены, что хотите удалить цель<br />
                <span className="font-medium text-gray-700 dark:text-gray-300">«{deleteConfirm.goal_summary}»</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-[2rem] text-sm font-medium transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleDeleteGoal(deleteConfirm.goal_id)}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-[2rem] text-sm font-medium transition-all"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Mentor;