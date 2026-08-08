import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { User, Calendar, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiClient } from '../utils/apiClient';

function ProfileSetupModalContent({ userId, onClose, onComplete }) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Пожалуйста, введите имя');
      return;
    }
    
    if (!birthDate) {
      setError('Пожалуйста, введите дату рождения');
      return;
    }

    // Validate date format (YYYY-MM-DD from date input)
    const date = new Date(birthDate);
    
    if (isNaN(date.getTime())) {
      setError('Некорректная дата');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const uid = userId || 1;
      
      console.log('Saving profile for user:', uid, { display_name: displayName.trim(), birth_date: birthDate });
      
      await apiClient.put(`/api/user/${uid}/profile-setup`, {
        display_name: displayName.trim(),
        birth_date: birthDate
      });
      
      console.log('Profile saved successfully');
      
      if (onComplete) await onComplete();
      onClose();
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Не удалось сохранить профиль');
    } finally {
      setLoading(false);
    }
  };

  const isRu = language === 'ru';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[28rem] bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] overflow-y-auto animate-fade-in">
        {/* Scrollable content */}
        <div className="px-6 pt-6 pb-2">
          {/* Header */}
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 mx-auto">
              <User size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white text-center mb-2">
              {isRu ? 'Расскажите о себе' : 'Tell us about yourself'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {isRu ? 'Это поможет нам персонализировать ваш опыт' : 'This helps us personalize your experience'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isRu ? 'Ваше имя' : 'Your name'}
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isRu ? 'Как вас называть?' : 'What should we call you?'}
                  className="w-full pl-12 pr-4 py-3 rounded-[2rem] bg-surface-light dark:bg-surface-dark border-2 border-transparent focus:border-violet-500 text-gray-800 dark:text-white placeholder-gray-400 outline-none transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Birth date input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isRu ? 'Дата рождения' : 'Birth date'}
              </label>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-[2rem] bg-surface-light dark:bg-surface-dark border-2 border-transparent focus:border-violet-500 text-gray-800 dark:text-white placeholder-gray-400 outline-none transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-[2rem] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-background-light dark:bg-background-dark rounded-b-[3.5rem] px-6 pb-6">
          <div className="h-px mb-4 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-[3rem] bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isRu ? 'Сохранение...' : 'Saving...'}
              </>
            ) : (
              <>
                {isRu ? 'Продолжить' : 'Continue'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSetupModal(props) {
  return ReactDOM.createPortal(
    <ProfileSetupModalContent {...props} />,
    document.body
  );
}
