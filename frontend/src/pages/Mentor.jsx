import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Target, BookOpen, Calendar, Zap, Sparkles, Plus, MessageSquare, GitBranch, CheckCircle2, Wand2, X, Trash2, ChevronDown, Search, Loader2 } from 'lucide-react';
import MentorBackground from '../components/MentorBackground';
import DreamInputModal from '../components/DreamInputModal';
import MentorGuideModal from '../components/MentorGuideModal';
import { useUser } from '../contexts/UserContext';
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
  const location = useLocation();
  const { userId } = useUser();
  const [habitData, setHabitData] = useState({ habits: [], xp: 0, level: 1, unlockedAchievements: [] });
  const [loading, setLoading] = useState(false);
  const [dreamModalOpen, setDreamModalOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingGoal, setViewingGoal] = useState(null);
  const [dreamExpanded, setDreamExpanded] = useState(false);
  const [recommendedMaterials, setRecommendedMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState(null);
  const [materialsExpanded, setMaterialsExpanded] = useState({});
  const [materialsCollapsed, setMaterialsCollapsed] = useState(true);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const MATERIALS_PREVIEW_COUNT = 3;

  const loadRecommendedMaterials = useCallback(async () => {
    try {
      setMaterialsLoading(true);
      setMaterialsError(null);
      const res = await axios.get(`${API_URL}/api/mentor/recommended-materials?user_id=${userId}`);
      if (res.data?.materials) {
        setRecommendedMaterials(res.data.materials);
      } else {
        setRecommendedMaterials([]);
      }
    } catch (err) {
      console.error('Failed to load recommended materials:', err);
      setMaterialsError('Не удалось загрузить рекомендации');
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendedMaterials();
  }, [loadRecommendedMaterials]);
  
  // Reload materials when goals change
  useEffect(() => {
    if (goals.length > 0) {
      loadRecommendedMaterials();
    }
  }, [goals.length, loadRecommendedMaterials]);

  const loadDreamGoals = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/mentor/dream-goals?user_id=${userId}`);
      if (res.data?.goals) {
        setGoals(res.data.goals.filter(g => g.status === 'active' || g.status === 'saved'));
      }
    } catch (err) {
      console.error('Failed to load dream goals:', err);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDreamGoals();
  }, [loadDreamGoals]);

  const handleDeleteGoal = async (goalId) => {
    try {
      await axios.delete(`${API_URL}/api/mentor/dream-goals/${goalId}?user_id=${userId}`);
      loadDreamGoals();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
    setDeleteConfirm(null);
  };

  // Handle navigation from suggestion pill "Создайте путь к своей мечте"
  useEffect(() => {
    if (location.state?.showDreamModal) {
      window.history.replaceState({}, document.title);
      setDreamModalOpen(true);
    }
  }, [location.state]);

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

          {/* Dream button — only show if no goals exist */}
          {!goalsLoading && goals.length === 0 && (
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
          )}

          {/* 3 Horizontal Blocks */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button onClick={() => setGuideModalOpen(true)} className="flex flex-col items-center justify-center gap-2 bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all aspect-square shadow-sm border border-gray-200 dark:border-transparent backdrop-blur-lg group">
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
                  user_id: userId,
                  agent_type: 'mentor',
                  welcome_message: 'Привет! 👋 Я — ваш ментор. Чем я могу помочь вам сегодня? Расскажите о своих целях, планах или задайте любой вопрос о развитии и самореализации.'
                });
                const chatId = res.data.chat_id || res.data.id;
                                navigate(`/chat/${chatId}`, { state: { scrollToTop: true } });
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

          {/* Active Goals */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Target size={18} className="text-red-500" />
              Активные цели
            </h2>
            {goalsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 backdrop-blur-lg border border-gray-200 dark:border-transparent animate-pulse"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-[3rem] bg-gray-200 dark:bg-gray-700 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4" />
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : goals.length === 0 ? (
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
                    onClick={() => setViewingGoal(goal)}
                    className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all group backdrop-blur-lg border border-gray-200 dark:border-transparent cursor-pointer"
                  >
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(goal); }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-red-500 dark:hover:bg-red-500 text-gray-500 dark:text-gray-300 hover:text-white flex items-center justify-center transition-all z-10"
                        title="Удалить"
                      >
                        <Trash2 size={14} />
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

          {/* Habits Tracker */}
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

          {/* Recommended Materials */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-500" />
              Рекомендованные материалы
            </h2>
            {materialsLoading ? (
              <div className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-8 text-center backdrop-blur-lg border border-gray-200 dark:border-transparent">
                <Loader2 size={24} className="mx-auto mb-3 text-indigo-400 animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка материалов...</p>
              </div>
            ) : materialsError ? (
              <div className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-6 text-center backdrop-blur-lg border border-gray-200 dark:border-transparent">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <X size={20} className="text-red-400 dark:text-red-500" />
                </div>
                <p className="text-sm text-red-500 dark:text-red-400 mb-2">{materialsError}</p>
                <button
                  onClick={loadRecommendedMaterials}
                  className="text-xs text-indigo-500 hover:text-indigo-600 underline"
                >
                  Попробовать снова
                </button>
              </div>
            ) : recommendedMaterials.length === 0 ? (
              <div className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-6 text-center backdrop-blur-lg border border-gray-200 dark:border-transparent">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <BookOpen size={20} className="text-indigo-400 dark:text-indigo-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Нет активных целей для подбора материалов
                </p>
                <button
                  onClick={() => setDreamModalOpen(true)}
                  className="text-xs text-amber-500 hover:text-amber-600 underline"
                >
                  Рассказать ментору о мечте
                </button>
              </div>
            ) : (
              <div className="space-y-3 overflow-hidden">
                {recommendedMaterials.map((mat, idx) => {
                  const isHidden = materialsCollapsed && idx >= MATERIALS_PREVIEW_COUNT;
                  const typeIcons = {
                    book: '📖',
                    course: '🎓',
                    article: '📝',
                    video: '🎥',
                    practice: '🔧'
                  };
                  const typeLabels = {
                    book: 'Книга',
                    course: 'Курс',
                    article: 'Статья',
                    video: 'Видео',
                    practice: 'Практика'
                  };
                  const isExpanded = materialsExpanded[idx] || false;
                  
                  return (
                    <div
                      key={`${mat.title}-${idx}`}
                      className={`overflow-hidden transition-all duration-500 ease-in-out ${
                        isHidden
                          ? 'max-h-0 opacity-0 pointer-events-none my-0 scale-95'
                          : 'max-h-[500px] opacity-100 my-3 scale-100'
                      }`}
                    >
                      <div className="bg-white/95 dark:bg-surface-dark rounded-[2rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all backdrop-blur-lg border border-gray-200 dark:border-transparent">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-lg shrink-0 shadow-md">
                            {mat.icon || '📚'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">
                                {mat.title}
                              </h3>
                              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap">
                                {typeLabels[mat.type] || mat.type}
                              </span>
                            </div>
                            <p className={`text-xs text-gray-500 dark:text-gray-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {mat.description}
                            </p>
                            {mat.goal_summary && (
                              <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                                <Target size={10} />
                                {mat.goal_summary}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(mat.title + ' — ' + mat.description)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-[2rem] transition-all shadow-sm hover:shadow-md"
                              >
                                <Search size={12} />
                                Найти в Google
                              </a>
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 italic">
                                ссылка может устареть
                              </span>
                              {mat.description.length > 100 && (
                                <button
                                  onClick={() => setMaterialsExpanded(prev => ({...prev, [idx]: !prev[idx]}))}
                                  className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                                >
                                  {isExpanded ? 'Свернуть' : 'Подробнее'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {recommendedMaterials.length > 0 && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    {materialsCollapsed && recommendedMaterials.length > MATERIALS_PREVIEW_COUNT && (
                      <button
                        onClick={() => setMaterialsCollapsed(false)}
                        className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-[2rem] text-xs font-medium text-indigo-500 dark:text-indigo-400 transition-all border border-dashed border-indigo-200 dark:border-indigo-800/50"
                      >
                        Показать ещё {recommendedMaterials.length - MATERIALS_PREVIEW_COUNT} материалов ↓
                      </button>
                    )}
                    {!materialsCollapsed && (
                      <button
                        onClick={() => setMaterialsCollapsed(true)}
                        className="w-full py-3 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-[2rem] text-xs font-medium text-gray-500 dark:text-gray-400 transition-all border border-dashed border-gray-200 dark:border-gray-700/50"
                      >
                        Свернуть ↑
                      </button>
                    )}
                    <button
                      onClick={loadRecommendedMaterials}
                      className="text-xs text-indigo-400 hover:text-indigo-500 transition-colors mt-1"
                    >
                      Обновить рекомендации ↻
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mentor Guide Modal */}
      <MentorGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />

      {/* Dream Input Modal */}
      <DreamInputModal
        isOpen={dreamModalOpen}
        onClose={() => setDreamModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white/95 dark:bg-surface-dark backdrop-blur-lg rounded-[3rem] p-8 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 mb-4 rounded-[3rem] bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <X size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                Удалить цель?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[240px]">
                Вы уверены, что хотите удалить цель
              </p>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
                «{deleteConfirm.goal_summary}»?
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-[3rem] text-sm font-medium transition-all active:scale-[0.98]"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDeleteGoal(deleteConfirm.goal_id)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-[3rem] text-sm font-medium transition-all shadow-md hover:shadow-xl shadow-red-500/20 active:scale-[0.98]"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-500/30 animate-pulse">
              <Loader2 size={32} className="text-white animate-spin" />
            </div>
            <p className="text-white text-sm font-medium">Создаём чат с ментором...</p>
          </div>
        </div>
      )}

      {/* Dream Details Modal */}
      {viewingGoal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setViewingGoal(null)}
        >
          <div
            className="bg-white/95 dark:bg-surface-dark backdrop-blur-lg rounded-[3rem] p-6 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {viewingGoal.goal_summary || 'Мечта'}
              </h3>
              <button
                onClick={() => setViewingGoal(null)}
                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-all text-gray-500 dark:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{categoryEmojis[viewingGoal.category] || '🎯'}</span>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                {categoryLabels[viewingGoal.category] || viewingGoal.category}
              </span>
            </div>

            {/* Dream text - collapsible */}
            {viewingGoal.dream_text && (
              <div className="mb-4">
                <button
                  onClick={() => setDreamExpanded(!dreamExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-amber-50/60 dark:bg-amber-900/15 rounded-[2rem] border border-amber-200/40 dark:border-amber-700/25 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 hover:border-amber-300/60 dark:hover:border-amber-600/40 transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">💭</span>
                    <div className="text-left min-w-0">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                        О чём мечта
                      </span>
                      {!dreamExpanded && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5 opacity-70">
                          {viewingGoal.dream_text.slice(0, 60)}{viewingGoal.dream_text.length > 60 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-amber-200/50 dark:bg-amber-700/30 text-amber-600 dark:text-amber-300 transition-transform duration-200 ${dreamExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={14} />
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${dreamExpanded ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                  <div className="p-4 bg-amber-50/80 dark:bg-amber-900/10 rounded-[2rem] border border-amber-200/50 dark:border-amber-700/30">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {viewingGoal.dream_text}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis */}
            {viewingGoal.analysis && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Анализ ментора
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/30 p-3 rounded-[2rem] leading-relaxed">
                  {viewingGoal.analysis}
                </p>
              </div>
            )}

            {/* Steps */}
            {viewingGoal.steps && viewingGoal.steps.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Шаги ({viewingGoal.steps.length})
                </h4>
                <div className="space-y-2">
                    {viewingGoal.steps.map((step, idx) => (
                      <div key={step.id || idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-[2rem]">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                          {step.id || idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white">{step.text}</p>
                          {step.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setLoading(true);
                              try {
                                // 1. Create a mentor chat
                                const createRes = await axios.post(`${API_URL}/api/chats`, {
                                  user_id: userId,
                                  agent_type: 'mentor',
                                });
                                const chatId = createRes.data.chat_id || createRes.data.id;
                                
                                // 2. Send user message to the chat
                                await axios.post(`${API_URL}/api/chat`, {
                                  user_id: userId,
                                  chat_id: chatId,
                                  agent: 'mentor',
                                message: `Привет, хочу обсудить с тобой ${step.text}${step.description ? `\n${step.description}` : ''}`
                                });
                                
                                navigate(`/chat/${chatId}`, { state: { scrollToTop: true } });
                              } catch (err) {
                                console.error('Failed to create mentor chat:', err);
                                setLoading(false);
                              }
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-[2rem] transition-all shadow-sm hover:shadow-md"
                          >
                            <MessageSquare size={12} />
                            Обсудить с ментором
                          </button>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date info */}
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <Calendar size={12} />
              <span>Создано: {viewingGoal.created_at ? new Date(viewingGoal.created_at).toLocaleDateString() : 'сегодня'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mentor;