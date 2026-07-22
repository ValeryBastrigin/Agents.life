import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import HabitTrackerModal from '../components/HabitTrackerModal';
import {
  Plus, Zap, Flame, Trophy, Star, Heart, AlertTriangle,
  ChevronLeft, ChevronRight, Calendar, Target, Sparkles,
  Award, TrendingUp, CheckCircle2, XCircle, Clock,
  Gift, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';

const XP_PER_LEVEL = 100;
const XP_PER_HABIT_COMPLETE = 10;
const XP_PER_STREAK_MILESTONE = 50;

const ACHIEVEMENTS = [
  { id: 'first_habit', name: 'Первый шаг', desc: 'Отметьте первую привычку', icon: '🌟', check: (stats) => stats.totalCompletions >= 1 },
  { id: 'week_streak', name: 'Неделя силы', desc: 'Недельный стрик любой привычки', icon: '🔥', check: (stats) => stats.bestStreak >= 7 },
  { id: 'month_warrior', name: 'Месячный воин', desc: '30-дневный стрик', icon: '⚔️', check: (stats) => stats.bestStreak >= 30 },
  { id: 'all_good', name: 'ЗОЖ-мастер', desc: 'Отметьте все полезные привычки за день', icon: '💪', check: (stats) => stats.allGoodToday },
  { id: 'bad_free', name: 'Победитель', desc: 'Не поддались вредной привычке 7 дней подряд', icon: '🏆', check: (stats) => stats.badStreak >= 7 },
  { id: 'collector', name: 'Коллекционер', desc: 'Добавьте 5 привычек', icon: '📚', check: (stats) => stats.totalHabits >= 5 },
  { id: 'level_5', name: 'Ученик', desc: 'Достигните 5 уровня', icon: '🎓', check: (stats) => stats.level >= 5 },
  { id: 'level_10', name: 'Мастер привычек', desc: 'Достигните 10 уровня', icon: '👑', check: (stats) => stats.level >= 10 },
];

const LEVEL_TITLES = [
  { level: 1, title: 'Новичок' },
  { level: 3, title: 'Подмастерье' },
  { level: 5, title: 'Ученик' },
  { level: 8, title: 'Энтузиаст' },
  { level: 12, title: 'Мастер' },
  { level: 16, title: 'Эксперт' },
  { level: 20, title: 'Легенда' },
];

function getStorageKey(userId) {
  return `habit_tracker_data_user_${userId || 'anonymous'}`;
}

function generateId() {
  return `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadData(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { habits: [], xp: 0, level: 1, unlockedAchievements: [], lastResetDate: getTodayKey() };
}

function saveData(data, userId) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(data));
}

function getLevelTitle(level) {
  let title = 'Новичок';
  for (const t of LEVEL_TITLES) {
    if (level >= t.level) title = t.title;
  }
  return title;
}

const HabitTracker = ({ theme }) => {
  const navigate = useNavigate();
  const { userId } = useUser();
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const [data, setData] = useState(() => loadData(userId));
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedHabit, setExpandedHabit] = useState(null);
  const [showAchievements, setShowAchievements] = useState(false);

  // Save on change
  useEffect(() => { saveData(data, userIdRef.current); }, [data]);

  // Daily reset check
  useEffect(() => {
    const today = getTodayKey();
    if (data.lastResetDate !== today) {
      setData(prev => {
        const habits = prev.habits.map(h => ({
          ...h,
          completedToday: false,
          // reset bad habit daily streak if it was missed? no, streak persists unless broken
        }));
        return { ...prev, habits, lastResetDate: today };
      });
    }
  }, []);

  const toggleComplete = (habitId) => {
    setData(prev => {
      const habits = prev.habits.map(h => {
        if (h.id !== habitId) return h;
        const today = getTodayKey();
        const wasCompleted = h.completedToday;
        let history = h.history || [];
        let streak = h.streak || 0;
        let xp = h.xp || 0;

        if (wasCompleted) {
          // Uncheck
          history = history.filter(entry => entry !== today);
          streak = Math.max(0, streak - 1);
          xp = Math.max(0, xp - XP_PER_HABIT_COMPLETE);
        } else {
          // Check
          history.push(today);
          // Check if yesterday was completed to increment streak
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = yesterday.toISOString().slice(0, 10);
          const hasYesterday = history.includes(yesterdayKey);
          if (hasYesterday || streak === 0) {
            streak += 1;
          } else {
            streak = 1; // reset streak to 1
          }
          xp += XP_PER_HABIT_COMPLETE;
        }

        return { ...h, completedToday: !wasCompleted, history, streak, xp };
      });

      // Recalculate total XP
      const totalXp = habits.reduce((sum, h) => sum + (h.xp || 0), 0);
      const newLevel = Math.floor(totalXp / XP_PER_LEVEL) + 1;

      // Check for new achievements
      const todayHabits = habits.filter(h => h.history?.includes(getTodayKey()));
      const goodHabits = habits.filter(h => h.type === 'good');
      const allGoodToday = goodHabits.length > 0 && goodHabits.every(h => h.history?.includes(getTodayKey()));
      const badHabits = habits.filter(h => h.type === 'bad');
      const bestStreak = Math.max(0, ...habits.map(h => h.streak || 0));
      const badStreak = Math.max(0, ...badHabits.map(h => h.streak || 0));
      const totalCompletions = habits.reduce((sum, h) => sum + (h.history?.length || 0), 0);
      
      const stats = { totalHabits: habits.length, bestStreak, badStreak, totalCompletions, allGoodToday, level: newLevel };
      
      const unlocked = prev.unlockedAchievements || [];
      const newAchievements = ACHIEVEMENTS.filter(a => !unlocked.includes(a.id) && a.check(stats));
      
      return { ...prev, habits, xp: totalXp, level: newLevel, unlockedAchievements: [...unlocked, ...newAchievements.map(a => a.id)], lastResetDate: getTodayKey() };
    });
  };

  const addHabit = (habit) => {
    setData(prev => ({
      ...prev,
      habits: [...prev.habits, { ...habit, id: generateId(), history: [], xp: 0 }]
    }));
  };

  const removeHabit = (habitId) => {
    setData(prev => ({
      ...prev,
      habits: prev.habits.filter(h => h.id !== habitId)
    }));
  };

  const resetAll = () => {
    if (window.confirm('Сбросить весь прогресс привычек?')) {
      setData({ habits: [], xp: 0, level: 1, unlockedAchievements: [], lastResetDate: getTodayKey() });
    }
  };

  const filteredHabits = useMemo(() => {
    let habits = data.habits;
    if (activeTab === 'good') habits = habits.filter(h => h.type === 'good');
    else if (activeTab === 'bad') habits = habits.filter(h => h.type === 'bad');
    else if (activeTab === 'done') habits = habits.filter(h => h.completedToday);
    else if (activeTab === 'pending') habits = habits.filter(h => !h.completedToday);
    return habits;
  }, [data.habits, activeTab]);

  const todayFull = useMemo(() => {
    const goodHabits = data.habits.filter(h => h.type === 'good');
    if (goodHabits.length === 0) return false;
    return goodHabits.every(h => h.history?.includes(getTodayKey()));
  }, [data.habits]);

  const nextLevelXp = data.level * XP_PER_LEVEL;
  const currentLevelXp = (data.level - 1) * XP_PER_LEVEL;
  const progressInLevel = Math.max(0, data.xp - currentLevelXp);
  const levelProgress = nextLevelXp - currentLevelXp > 0
    ? (progressInLevel / (nextLevelXp - currentLevelXp)) * 100
    : 100;

  const newAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter(a => (data.unlockedAchievements || []).includes(a.id));
  }, [data.unlockedAchievements]);

  const lockedAchievements = ACHIEVEMENTS.filter(a => !(data.unlockedAchievements || []).includes(a.id));

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/mentor')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Zap size={22} className="text-amber-500" />
            Трекер привычек
          </h1>
          <button onClick={resetAll} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors" title="Сбросить">
            <RefreshCw size={18} className="text-gray-400 hover:text-red-500 transition-colors" />
          </button>
        </div>

        {/* Level & XP Card */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] p-5 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={18} className="text-yellow-200" />
                <span className="text-white/80 text-xs font-medium">УРОВЕНЬ {data.level}</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{getLevelTitle(data.level)}</h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{data.xp} XP</div>
              <div className="text-xs text-white/70">всего</div>
            </div>
          </div>
          {/* XP Bar */}
          <div className="relative">
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, levelProgress)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/70 mt-1">
              <span>{data.xp - currentLevelXp} XP получено</span>
              <span>{nextLevelXp - data.xp} XP до уровня {data.level + 1}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-4 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame size={16} className="text-orange-500" />
              <span className="text-xl font-bold text-gray-800 dark:text-white">
                {Math.max(0, ...data.habits.map(h => h.streak || 0))}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Лучший стрик</div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-4 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star size={16} className="text-amber-500" />
              <span className="text-xl font-bold text-gray-800 dark:text-white">
                {data.habits.reduce((sum, h) => sum + (h.history?.length || 0), 0)}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Выполнено всего</div>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-4 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Award size={16} className="text-purple-500" />
              <span className="text-xl font-bold text-gray-800 dark:text-white">{newAchievements.length}</span>
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Достижения</div>
          </div>
        </div>

        {/* Achievements preview */}
        {newAchievements.length > 0 && (
          <button
            onClick={() => setShowAchievements(!showAchievements)}
            className="w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-[1.5rem] p-3 mb-4 flex items-center justify-between group hover:from-purple-500/20 hover:to-pink-500/20 transition-all"
          >
            <div className="flex items-center gap-2">
              <Gift size={16} className="text-purple-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {newAchievements.length} достижений получено!
              </span>
            </div>
            {showAchievements ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
        )}

        {showAchievements && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-4 mb-4 shadow-sm space-y-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Достижения</h3>
            {newAchievements.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-white">{a.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{a.desc}</div>
                </div>
                <CheckCircle2 size={18} className="ml-auto text-green-500" />
              </div>
            ))}
            {lockedAchievements.length > 0 && (
              <>
                <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 pb-1">Закрытые достижения:</div>
                {lockedAchievements.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl opacity-50">
                    <span className="text-2xl grayscale">{a.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{a.name}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{a.desc}</div>
                    </div>
                    <XCircle size={16} className="ml-auto text-gray-400" />
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'Все', icon: null },
            { id: 'good', label: 'Полезные', icon: <Heart size={14} className="text-green-500" /> },
            { id: 'bad', label: 'Вредные', icon: <AlertTriangle size={14} className="text-red-500" /> },
            { id: 'done', label: 'Готово', icon: <CheckCircle2 size={14} className="text-green-500" /> },
            { id: 'pending', label: 'В ожидании', icon: <Clock size={14} className="text-amber-500" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-surface-light dark:bg-surface-dark text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Habits List */}
        {filteredHabits.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-[2rem] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
              <Target size={28} className="text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              {activeTab === 'good' ? 'Нет полезных привычек' :
               activeTab === 'bad' ? 'Нет вредных привычек' :
               activeTab === 'done' ? 'Ничего не отмечено сегодня' :
               'Все привычки выполнены!'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {activeTab === 'done' || activeTab === 'pending'
                ? 'Отличная работа!'
                : 'Добавьте привычки, чтобы начать отслеживание'}
            </p>
            {(activeTab !== 'done' && activeTab !== 'pending') && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-[2rem] text-sm font-medium transition-all shadow-md"
              >
                <Plus size={16} />
                Добавить привычки
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredHabits.map(habit => {
              const isExpanded = expandedHabit === habit.id;
              const weekHistory = getWeekHistory(habit.history || []);
              const today = getTodayKey();

              return (
                <div
                  key={habit.id}
                  className={`bg-surface-light dark:bg-surface-dark rounded-[1.5rem] overflow-hidden transition-all shadow-sm ${
                    habit.completedToday ? 'ring-2 ring-green-400/50 dark:ring-green-500/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Complete button */}
                    <button
                      onClick={() => toggleComplete(habit.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 transition-all ${
                        habit.completedToday
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-md scale-110'
                          : `bg-gradient-to-br ${habit.color || 'from-gray-300 to-gray-400'} opacity-70 hover:opacity-100 hover:scale-105`
                      }`}
                    >
                      {habit.completedToday ? (
                        <CheckCircle2 size={20} className="text-white" />
                      ) : (
                        <span className="text-white">{habit.icon || '⭐'}</span>
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${habit.completedToday ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-white'} transition-colors`}>
                        {habit.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {habit.type === 'bad' && (
                          <span className="text-red-400">Вредная</span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Flame size={11} className="text-orange-500" />
                          {habit.streak || 0} дней
                        </span>
                        <span>{habit.history?.length || 0} раз</span>
                      </div>
                    </div>

                    {/* XP badge */}
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-500">+{habit.xp || 0} XP</div>
                      <button
                        onClick={() => setExpandedHabit(isExpanded ? null : habit.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mt-0.5"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded week view */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700/50 mt-0">
                      <div className="flex items-center gap-1.5 pt-2 pb-1 overflow-x-auto">
                        <Calendar size={12} className="text-gray-400 shrink-0" />
                        {weekHistory.map((day, i) => (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
                                day.completed
                                  ? 'bg-green-500 text-white shadow-sm'
                                  : day.isFuture
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {day.label}
                            </div>
                            <span className="text-[8px] text-gray-400">{day.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => removeHabit(habit.id)}
                        className="mt-2 text-xs text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                      >
                        <XCircle size={12} />
                        Удалить привычку
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Today's Progress Summary */}
        {data.habits.length > 0 && (
          <div className="mt-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 rounded-[1.5rem] p-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-green-500" />
              Прогресс дня
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        data.habits.filter(h => h.type === 'good').length > 0
                          ? (data.habits.filter(h => h.type === 'good' && h.completedToday).length / data.habits.filter(h => h.type === 'good').length) * 100
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>
              <div className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {data.habits.filter(h => h.type === 'good' && h.completedToday).length}/{data.habits.filter(h => h.type === 'good').length}
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Полезные привычки</span>
              {todayFull && (
                <span className="text-green-500 font-medium flex items-center gap-0.5">
                  <Sparkles size={12} />
                  Все выполнены!
                </span>
              )}
            </div>
          </div>
        )}

        {/* FAB Add button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center group z-40"
        >
          <Plus size={28} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Add Modal */}
        <HabitTrackerModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddHabit={addHabit}
        />
      </div>
    </div>
  );
};

// Helper: get week history
function getWeekHistory(history) {
  const days = [];
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const isFuture = date > today;
    days.push({
      label: date.getDate(),
      name: dayNames[date.getDay()],
      completed: history.includes(key),
      isFuture,
      key,
    });
  }
  return days;
}

export default HabitTracker;