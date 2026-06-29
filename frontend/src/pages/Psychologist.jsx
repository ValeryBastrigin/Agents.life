import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Smile, Brain, Moon, Sunrise, BarChart3, MessageCircle, Calendar, Sparkles, Coffee } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Psychologist = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [mood, setMood] = useState(null);

  const moodOptions = [
    { emoji: '😊', label: 'Отлично', color: 'from-green-500 to-emerald-500' },
    { emoji: '🙂', label: 'Хорошо', color: 'from-blue-500 to-cyan-500' },
    { emoji: '😐', label: 'Нормально', color: 'from-amber-500 to-yellow-500' },
    { emoji: '😔', label: 'Так себе', color: 'from-orange-500 to-red-500' },
    { emoji: '😢', label: 'Плохо', color: 'from-red-500 to-pink-500' },
  ];

  const practices = [
    { 
      title: 'Медитация осознанности', 
      duration: '10 мин', 
      icon: '🧘', 
      description: 'Успокойте ум и сосредоточьтесь на настоящем моменте.',
      gradient: 'from-purple-500 to-violet-500'
    },
    { 
      title: 'Дыхательное упражнение', 
      duration: '5 мин', 
      icon: '🌬️', 
      description: 'Техника 4-7-8 для быстрого снятия стресса.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      title: 'Дневник благодарности', 
      duration: '15 мин', 
      icon: '📔', 
      description: 'Запишите 3 вещи, за которые вы благодарны сегодня.',
      gradient: 'from-amber-500 to-orange-500'
    },
    { 
      title: 'Прогрессивная релаксация', 
      duration: '20 мин', 
      icon: '💆', 
      description: 'Поочерёдное напряжение и расслабление групп мышц.',
      gradient: 'from-green-500 to-emerald-500'
    },
  ];

  const moodHistory = [
    { day: 'Пн', mood: '🙂', color: 'bg-blue-400' },
    { day: 'Вт', mood: '😊', color: 'bg-green-400' },
    { day: 'Ср', mood: '😐', color: 'bg-amber-400' },
    { day: 'Чт', mood: '😊', color: 'bg-green-400' },
    { day: 'Пт', mood: '😔', color: 'bg-orange-400' },
    { day: 'Сб', mood: '🙂', color: 'bg-blue-400' },
    { day: 'Вс', mood: '😊', color: 'bg-green-400' },
  ];

  return (
<div className="flex-1 overflow-y-auto px-6 pt-4 pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">🧠 Психолог</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Ваше ментальное здоровье имеет значение. Мы здесь, чтобы поддержать.</p>
        </div>

        {/* Mood Tracker */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Как вы себя чувствуете сейчас?
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {moodOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => setMood(index)}
                className={`flex-shrink-0 min-w-[72px] flex flex-col items-center gap-2 p-3 rounded-[1rem] transition-all ${
                  mood === index
                    ? `bg-gradient-to-br ${option.color} text-white shadow-lg scale-105`
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
          {mood !== null && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-[1rem] text-center">
              <p className="text-green-700 dark:text-green-300">
                Спасибо! Ваше настроение записано. Продолжайте заботиться о себе! ✨
              </p>
            </div>
          )}
        </div>

        {/* Mood History */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={22} className="text-purple-500" />
            Настроение за неделю
          </h2>
          <div className="flex justify-between items-end gap-2">
            {moodHistory.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-2xl">{day.mood}</span>
                <div className={`w-full ${day.color} rounded-full transition-all`} 
                  style={{ height: `${40 + Math.random() * 40}px` }} 
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Practices */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles size={22} className="text-amber-500" />
            Практики и упражнения
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practices.map((practice, index) => (
              <button
                key={index}
                className="flex items-start gap-4 p-5 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-all text-left group"
              >
                <div className={`w-14 h-14 rounded-[3rem] bg-gradient-to-br ${practice.gradient} flex items-center justify-center text-2xl shadow-md group-hover:shadow-xl transition-all flex-shrink-0`}>
                  {practice.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800 dark:text-white">{practice.title}</h3>
                    <span className="text-xs text-purple-500 font-medium">{practice.duration}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{practice.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button className="flex flex-col items-center gap-2 p-4 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-12 h-12 rounded-[3rem] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <MessageCircle size={24} className="text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Чат с психологом</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-12 h-12 rounded-[3rem] bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Moon size={24} className="text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Звуки для сна</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-12 h-12 rounded-[3rem] bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Brain size={24} className="text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Когнитивные упражнения</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <div className="w-12 h-12 rounded-[3rem] bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Heart size={24} className="text-white" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Дневник эмоций</span>
          </button>
        </div>

        {/* Quote / Affirmation */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 rounded-[3.5rem] p-6 text-white text-center">
          <p className="text-2xl mb-2">💜</p>
          <p className="text-lg font-medium mb-2">
            «Ты не один. Каждая эмоция — это часть пути, и ты справляешься лучше, чем думаешь.»
          </p>
          <p className="text-sm text-white/70">— Твой психолог</p>
        </div>
      </div>
    </div>
  );
};

export default Psychologist;