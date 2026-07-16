import React, { useState, useEffect } from 'react';
import { User, Calendar, Sparkles } from 'lucide-react';

const OnboardingModal = ({ isOpen, onClose, onComplete }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (name.trim() && age) {
      onComplete({ name: name.trim(), age: parseInt(age) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-600 mb-4">
            <User size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Давайте познакомимся
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Расскажите немного о себе, чтобы агенты могли лучше вам помогать
          </p>
        </div>

        {/* Form */}
        <div className="px-8 pb-8 space-y-5">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ваше имя
            </label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как вас зовут?"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Age Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ваш возраст
            </label>
            <div className="relative">
              <Calendar size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Сколько вам лет?"
                min="1"
                max="120"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !age}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold text-base shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            Начать пользоваться
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
