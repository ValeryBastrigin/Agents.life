import React from 'react';
import { Target, BookOpen, Star, Calendar, Zap, Flag, Brain, Rocket } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Mentor = () => {
  const { t } = useLanguage();
  const goals = [
    { 
      title: 'Выучить TypeScript', 
      progress: 65, 
      deadline: '15 июля',
      icon: '📘',
      gradient: 'from-blue-500 to-cyan-500',
      category: 'Технические навыки'
    },
    { 
      title: 'Прочитать 12 книг за год', 
      progress: 42, 
      deadline: '31 декабря',
      icon: '📚',
      gradient: 'from-amber-500 to-orange-500',
      category: 'Саморазвитие'
    },
    { 
      title: 'Запустить pet-проект', 
      progress: 30, 
      deadline: '1 сентября',
      icon: '🚀',
      gradient: 'from-purple-500 to-pink-500',
      category: 'Карьера'
    },
  ];

  const habits = [
    { name: 'Утренняя зарядка', streak: 12, icon: '🏃', color: 'from-green-500 to-emerald-500' },
    { name: 'Чтение 30 минут', streak: 8, icon: '📖', color: 'from-blue-500 to-cyan-500' },
    { name: 'Медитация', streak: 5, icon: '🧘', color: 'from-purple-500 to-violet-500' },
    { name: 'Вести дневник', streak: 3, icon: '✍️', color: 'from-pink-500 to-rose-500' },
  ];

  const resources = [
    { title: 'Как ставить SMART-цели', type: 'Статья', duration: '8 мин', icon: '🎯', gradient: 'from-red-500 to-pink-500' },
    { title: 'Техника Pomodoro', type: 'Видео', duration: '12 мин', icon: '🍅', gradient: 'from-orange-500 to-red-500' },
    { title: 'Матрица Эйзенхауэра', type: 'Инфографика', duration: '5 мин', icon: '📊', gradient: 'from-blue-500 to-indigo-500' },
    { title: 'Сила привычек', type: 'Книга', duration: '6 часов', icon: '📕', gradient: 'from-green-500 to-teal-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8">
      <div className="max-w-2xl mx-auto">

        {/* Motivation Banner */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 rounded-[3rem] p-5 mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🏆</div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Путь к успеху</h2>
              <p className="text-white/80 text-xs">
                Большие результаты начинаются с маленьких шагов. Каждый день приближает вас к цели.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            <div className="flex-1 text-center bg-white/10 rounded-[1rem] p-2">
              <div className="text-xl font-bold">7</div>
              <div className="text-[10px] text-white/70">активных целей</div>
            </div>
            <div className="flex-1 text-center bg-white/10 rounded-[1rem] p-2">
              <div className="text-xl font-bold">46%</div>
              <div className="text-[10px] text-white/70">общий прогресс</div>
            </div>
            <div className="flex-1 text-center bg-white/10 rounded-[1rem] p-2">
              <div className="text-xl font-bold">28</div>
              <div className="text-[10px] text-white/70">дней подряд</div>
            </div>
          </div>
        </div>

        {/* Goals Grid */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Target size={18} className="text-red-500" />
            Активные цели
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {goals.map((goal, index) => (
              <div key={index} className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all group">
                <div className={`w-10 h-10 rounded-[3rem] bg-gradient-to-br ${goal.gradient} flex items-center justify-center text-xl mb-2 shadow-md group-hover:shadow-xl transition-all`}>
                  {goal.icon}
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-0.5">{goal.title}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">{goal.category}</p>
                {/* Progress bar */}
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
        </div>

        {/* Habits Tracker */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            Трекер привычек
          </h2>
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
        </div>

        {/* Learning Resources */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-500" />
            Рекомендованные материалы
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resources.map((resource, index) => (
              <button key={index} className="flex items-center gap-3 p-3 bg-surface-light dark:bg-surface-dark rounded-[3rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-left group">
                <div className={`w-10 h-10 rounded-[3rem] bg-gradient-to-br ${resource.gradient} flex items-center justify-center text-lg shadow-md group-hover:shadow-xl transition-all flex-shrink-0`}>
                  {resource.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 dark:text-white text-sm truncate">{resource.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                      {resource.type}
                    </span>
                    <span className="text-[10px] text-gray-400">{resource.duration}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button className="flex flex-col items-center gap-1.5 p-3 bg-surface-light dark:bg-surface-dark rounded-[3rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-10 h-10 rounded-[3rem] bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Flag size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Поставить цель</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 p-3 bg-surface-light dark:bg-surface-dark rounded-[3rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-10 h-10 rounded-[3rem] bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">План развития</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 p-3 bg-surface-light dark:bg-surface-dark rounded-[3rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-10 h-10 rounded-[3rem] bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Rocket size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Карьерный рост</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 p-3 bg-surface-light dark:bg-surface-dark rounded-[3rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-10 h-10 rounded-[3rem] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Star size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Достижения</span>
          </button>
        </div>

        {/* Quote */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 rounded-[3rem] p-5 text-white text-center">
          <p className="text-2xl mb-1">🌟</p>
          <p className="text-base font-medium mb-1">
            «Успех — это лестница, на которую не взобраться с руками в карманах.»
          </p>
          <p className="text-xs text-white/70">— Зиг Зиглар</p>
        </div>
      </div>
    </div>
  );
};

export default Mentor;