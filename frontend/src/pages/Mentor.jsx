import React, { useState } from 'react';
import { Target, BookOpen, Star, Calendar, Zap, Flag, Brain, Rocket, ChevronDown, ChevronUp, Sparkles, Plus, Lightbulb, GitBranch } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Mentor = () => {
  const { t } = useLanguage();
  const [heroExpanded, setHeroExpanded] = useState(true);
  
  const goals = [];
  // goals will be loaded from API later

  const habits = [];
  // habits will be loaded from API later

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8">
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

          <button className="flex flex-col items-center justify-center gap-2 bg-surface-light dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all aspect-square shadow-sm border border-gray-100 dark:border-transparent group">
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
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            Трекер привычек
          </h2>
          {habits.length === 0 ? (
            <button className="w-full flex items-center justify-center gap-3 p-5 bg-surface-light dark:bg-surface-dark rounded-[3rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-all group border-2 border-dashed border-gray-300 dark:border-gray-600">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all">
                <Plus size={22} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white">Добавьте полезные привычки, уберите вредные</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Начните формировать новые привычки уже сегодня</p>
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {habits.map((habit, index) => (
                <div key={index} className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-3 text-center hover:bg-gray-200 dark:hover:bg-gray-800 transition-all">
                  <div className={`w-9 h-9 mx-auto rounded-[3rem] bg-gradient-to-br ${habit.color} flex items-center justify-center text-lg mb-1.5`}>
                    {habit.icon}
                  </div>
                  <div className="text-xs font-medium text-gray-800 dark:text-white mb-1">
                    {habit.name}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-base">🔥</span>
                    <span className="text-sm font-bold text-amber-500">{habit.streak}</span>
                    <span className="text-[10px] text-gray-400">дней</span>
                  </div>
                </div>
              ))}
            </div>
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
  );
};

export default Mentor;