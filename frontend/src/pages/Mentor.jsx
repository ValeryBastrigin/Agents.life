import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, BookOpen, Star, Calendar, Zap, Flag, Brain, Rocket, ChevronDown, ChevronUp, Sparkles, Plus, Lightbulb, GitBranch, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import MentorBackground from '../components/MentorBackground';

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

const COLOR_MAP = {
  'from-green-500 to-emerald-500': { bg: 'from-green-500 to-emerald-500' },
  'from-blue-500 to-cyan-500': { bg: 'from-blue-500 to-cyan-500' },
  'from-purple-500 to-pink-500': { bg: 'from-purple-500 to-pink-500' },
  'from-yellow-500 to-orange-500': { bg: 'from-yellow-500 to-orange-500' },
  'from-red-500 to-rose-500': { bg: 'from-red-500 to-rose-500' },
  'from-teal-500 to-green-500': { bg: 'from-teal-500 to-green-500' },
  'from-indigo-500 to-purple-500': { bg: 'from-indigo-500 to-purple-500' },
  'from-pink-500 to-red-500': { bg: 'from-pink-500 to-red-500' },
};

const getColor = (name) => {
  const colors = Object.keys(COLOR_MAP);
  const idx = name.length % colors.length;
  return colors[idx];
};

const Mentor = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [heroExpanded, setHeroExpanded] = useState(true);
  const [habitData, setHabitData] = useState({ habits: [], xp: 0, level: 1, unlockedAchievements: [] });

  const toggleHabitComplete = (habitId) => {
    const data = loadHabitData();
    const todayKey = getTodayKey();
    const idx = data.habits.findIndex(h => h.id === habitId);
    if (idx === -1) return;
    const habit = data.habits[idx];
    if (!habit.log) habit.log = {};
    if (habit.log[todayKey]) {
      delete habit.log[todayKey];
      // Remove XP when unchecking
      data.xp = Math.max(0, (data.xp || 0) - 10);
      // Recalculate level based on XP
      data.level = Math.floor(data.xp / 100) + 1;
    } else {
      habit.log[todayKey] = true;
      // Add XP
      data.xp = (data.xp || 0) + 10;
      // Level up every 100 XP
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
    // Also poll periodically for same-tab changes
    const interval = setInterval(() => setHabitData(loadHabitData()), 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Compute today's habits with streak info for the widget
  const todayKey = getTodayKey();
  const habits = useMemo(() => {
    return habitData.habits.map(h => {
      const log = h.log || {};
      const history = h.history || [todayKey];
      // Compute streak
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

  const goals = [];
  // goals will be loaded from API later

  return (
    <div className="flex-1 relative overflow-hidden">
      <MentorBackground />
      <div className="relative z-10 overflow-y-auto h-full px-6 pt-4 pb-8">
        <div className="max-w-2xl mx-auto">

          {/* Collapsible Hero Section — Путь к успеху (original design) */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 rounded-[3rem] p-5 mb-6 text-white">
            {/* Clickable header that toggles collapse */}
            <button
              onClick={() => setHeroExpanded(!heroExpanded)}
              className="flex items-center justify-between gap-3 w-full text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-4xl shrink-0">🏆</div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold mb-0.5">Путь к успеху</h2>
                  <p className="text-white/80 text-xs">Большие результаты начинаются с маленьких шагов. Каждый день приближает вас к цели.</p>
                </div>
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0">
                {heroExpanded ? <ChevronUp size={18} className="text-white" /> : <ChevronDown size={18} className="text-white" />}
              </div>
            </button>

            {/* Expanded content — stats row */}
            <div className={`overflow-hidden transition-all duration-300 ${heroExpanded ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="flex gap-3">
                <div className="flex-1 text-center bg-white/10 rounded-[1rem] p-3">
                  <div className="text-xl font-bold">0</div>
                  <div className="text-[10px] text-white/70">активных целей</div>
                </div>
                <div className="flex-1 text-center bg-white/10 rounded-[1rem] p-3">
                  <div className="text-xl font-bold">0%</div>
                  <div className="text-[10px] text-white/70">общий прогресс</div>
                </div>
                <div className="flex-1 text-center bg-white/10 rounded-[1rem] p-3">
                  <div className="text-xl font-bold">0</div>
                  <div className="text-[10px] text-white/70">дней подряд</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Horizontal Blocks */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button className="flex flex-col items-center justify-center gap-2 bg-surface-light dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all aspect-square shadow-sm border border-gray-100 dark:border-transparent group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all">
                <BookOpen size={20} className="text-white" />
              </div>
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                Как пользоваться ментором?
              </span>
            </button>

            <button className="flex flex-col items-center justify-center gap-2 bg-surface-light dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all aspect-square shadow-sm border border-gray-100 dark:border-transparent group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all">
                <Lightbulb size={20} className="text-white" />
              </div>
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                Центр инсайтов
              </span>
            </button>

            <button onClick={() => navigate('/mentor/tree')} className="flex flex-col items-center justify-center gap-2 bg-surface-light dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all aspect-square shadow-sm border border-gray-100 dark:border-transparent group">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all">
                <GitBranch size={20} className="text-white" />
              </div>
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                Дерево развития
              </span>
            </button>
          </div>

          {/* Active Goals — dynamic, no stub if empty */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Target size={18} className="text-red-500" />
              Активные цели
            </h2>
            {goals.length === 0 ? (
              <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Target size={20} className="text-red-400 dark:text-red-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Нет активных целей
                </p>
                <button className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-[2rem] text-sm font-medium transition-all shadow-md hover:shadow-xl">
                  <Plus size={16} />
                  Добавить цели
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {goals.map((goal, index) => (
                  <div key={index} className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all group">
                    <div className={`w-10 h-10 rounded-[3rem] bg-gradient-to-br ${goal.gradient} flex items-center justify-center text-xl mb-2 shadow-md group-hover:shadow-xl transition-all`}>
                      {goal.icon}
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-0.5">{goal.title}</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">{goal.category}</p>
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Прогресс</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{goal.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${goal.gradient} rounded-full transition-all`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Calendar size={10} />
                      <span>До {goal.deadline}</span>
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
            {/* BIG PLUS BUTTON — always visible, opens habit tracker */}
            <button onClick={() => navigate('/mentor/habits')} className="w-full flex items-center justify-center gap-3 p-5 bg-surface-light dark:bg-surface-dark rounded-[3rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-all group border-2 border-dashed border-gray-300 dark:border-gray-600 mb-3">
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
                {/* Stats summary */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 bg-surface-light dark:bg-surface-dark rounded-[2rem] px-4 py-2.5 text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{habits.filter(h => h.doneToday).length}/{habits.length}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">выполнено сегодня</div>
                  </div>
                  <div className="flex-1 bg-surface-light dark:bg-surface-dark rounded-[2rem] px-4 py-2.5 text-center">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{habitData.level}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">уровень</div>
                  </div>
                  <div className="flex-1 bg-surface-light dark:bg-surface-dark rounded-[2rem] px-4 py-2.5 text-center">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{habitData.xp} XP</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">опыт</div>
                  </div>
                </div>
                {/* Habits list — vertical with checkboxes */}
                <div className="flex flex-col gap-2">
                  {habits.map((habit, index) => (
                    <label
                      key={index}
                      className={`flex items-center gap-3 px-4 py-3 bg-surface-light dark:bg-surface-dark rounded-[2rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-all cursor-pointer select-none ${habit.doneToday ? 'ring-2 ring-green-400 dark:ring-green-500' : ''}`}
                    >
                      {/* Checkbox */}
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
                      {/* Icon + name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">{habit.icon}</span>
                        <span className={`text-sm font-medium truncate ${habit.type === 'bad' ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                          {habit.name}
                        </span>
                      </div>
                      {/* Streak */}
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
            <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <BookOpen size={20} className="text-indigo-400 dark:text-indigo-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Подбор материалов будет происходить умным образом
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Mentor;