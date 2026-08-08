import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Bell, Zap } from 'lucide-react';

export default function AgentNotificationSettingsModal({ isOpen, onClose, userId }) {
  const storageKey = `agent_notification_settings_${userId || 'anonymous'}`;
  
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return {
      mentor_habits: true,
      accountant_calendar: true,
      accountant_statement: true,
      secretary_events: true,
    };
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSetting = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) { /* ignore */ }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl flex flex-col p-6 border border-gray-200 dark:border-gray-700 max-h-[85vh]">
        
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
              <Bell size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              Уведомления агентов
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          
          {/* 1. Ментор */}
          <div className="bg-white/80 dark:bg-surface-dark rounded-3xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/icons/agents/ментор.svg" alt="Ментор" className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.target.src = '/assets/icons/agents/ментор.png'; }} />
              <div>
                <span className="font-semibold text-gray-800 dark:text-white text-sm block">Ментор</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Трекер привычек</span>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('mentor_habits')}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.mentor_habits ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.mentor_habits ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* 2. Финансовый ассистент - Расчетный календарь (Важно!) */}
          <div className="bg-white/80 dark:bg-surface-dark rounded-3xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/icons/agents/бухгалтер.svg" alt="Бухгалтер" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-800 dark:text-white text-sm">Финансовый ассистент</span>
                  <span title="Важное уведомление" className="flex items-center text-amber-500"><Zap size={14} className="fill-amber-500" /></span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Расчетный календарь</span>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('accountant_calendar')}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.accountant_calendar ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.accountant_calendar ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* 3. Финансовый ассистент - Банковская выписка */}
          <div className="bg-white/80 dark:bg-surface-dark rounded-3xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/icons/agents/бухгалтер.svg" alt="Бухгалтер" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <span className="font-semibold text-gray-800 dark:text-white text-sm block">Финансовый ассистент</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Банковская выписка (раз в месяц)</span>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('accountant_statement')}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.accountant_statement ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.accountant_statement ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* 4. Тайм-менеджер (Важно!) */}
          <div className="bg-white/80 dark:bg-surface-dark rounded-3xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/icons/agents/секретарь.svg" alt="Секретарь" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-800 dark:text-white text-sm">Тайм-менеджер</span>
                  <span title="Важное уведомление" className="flex items-center text-amber-500"><Zap size={14} className="fill-amber-500" /></span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">События и напоминания</span>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('secretary_events')}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.secretary_events ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.secretary_events ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-[3rem] bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors shadow-md"
          >
            Готово
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
