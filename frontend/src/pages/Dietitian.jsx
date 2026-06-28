import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Apple, MapPin, Scale, TrendingUp, PieChart, Calendar, ChevronRight, Flame, Coffee, Moon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Dietitian = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Daily nutrition summary
  const nutritionSummary = {
    calories: { current: 1450, goal: 2000, unit: 'ккал' },
    protein: { current: 75, goal: 120, unit: 'г' },
    fats: { current: 45, goal: 65, unit: 'г' },
    carbs: { current: 180, goal: 250, unit: 'г' },
    water: { current: 5, goal: 8, unit: 'стаканов' },
  };

  const meals = [
    { name: 'Завтрак', time: '08:00', calories: 450, items: 'Овсянка с ягодами, яйцо, зелёный чай', color: 'from-amber-500 to-orange-500' },
    { name: 'Перекус', time: '11:00', calories: 180, items: 'Греческий йогурт, горсть орехов', color: 'from-green-500 to-emerald-500' },
    { name: 'Обед', time: '14:00', calories: 520, items: 'Куриная грудка, гречка, овощной салат', color: 'from-blue-500 to-cyan-500' },
    { name: 'Перекус', time: '17:00', calories: 150, items: 'Яблоко, протеиновый батончик', color: 'from-purple-500 to-pink-500' },
    { name: 'Ужин', time: '20:00', calories: 350, items: 'Рыба на пару, брокколи', color: 'from-indigo-500 to-violet-500' },
  ];

  const tips = [
    'Выпивайте стакан воды за 30 минут до еды — это помогает контролировать аппетит.',
    'Старайтесь есть не менее 5 порций овощей и фруктов в день.',
    'Не пропускайте завтрак — он запускает метаболизм на весь день.',
  ];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button + Title */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-[3rem] transition-colors"
          >
            <ArrowLeft size={22} className="text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">🍎 Диетолог</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Отслеживайте питание, калории и получайте персональные рекомендации.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-1">
          {['overview', 'meals', 'recipes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 px-4 py-2 rounded-[1.25rem] transition-colors text-sm font-medium ${
                selectedTab === tab
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              {tab === 'overview' ? 'Обзор' : tab === 'meals' ? 'Приёмы пищи' : 'Рецепты'}
            </button>
          ))}
        </div>

        {/* Nutrition Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {Object.entries(nutritionSummary).map(([key, value]) => (
            <div key={key} className="p-4 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] text-center">
              <div className="text-2xl mb-1">
                {key === 'calories' ? '🔥' : key === 'protein' ? '🥩' : key === 'fats' ? '🥑' : key === 'carbs' ? '🍞' : '💧'}
              </div>
              <div className="text-lg font-bold text-gray-800 dark:text-white">
                {value.current}/{value.goal}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {value.unit}
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min((value.current / value.goal) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Meals Timeline */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
            🕐 План питания на сегодня
          </h2>
          <div className="space-y-4">
            {meals.map((meal, index) => (
              <div key={index} className="flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shadow-md"
                    style={{ background: `linear-gradient(135deg, ${meal.color.split(' ')[1]}, ${meal.color.split(' ')[3]})` }}
                  >
                    {meal.time.split(':')[0]}
                  </div>
                  {index < meals.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800 dark:text-white">{meal.name}</h3>
                    <span className="text-sm text-green-500 font-medium">{meal.calories} ккал</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{meal.items}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button className="flex flex-col items-center gap-2 p-4 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-12 h-12 rounded-[3rem] bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Flame size={24} className="text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Рассчитать калории</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-12 h-12 rounded-[3rem] bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Scale size={24} className="text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">План похудения</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-12 h-12 rounded-[3rem] bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <TrendingUp size={24} className="text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Набор массы</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-12 h-12 rounded-[3rem] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <PieChart size={24} className="text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Анализ рациона</span>
          </button>
        </div>

        {/* Tips Section */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 rounded-[3.5rem] p-6 text-white">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Coffee size={24} />
            Советы диетолога
          </h2>
          <div className="space-y-3">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3 bg-white/10 rounded-[1rem] p-3">
                <span className="text-lg">💡</span>
                <p className="text-sm">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dietitian;