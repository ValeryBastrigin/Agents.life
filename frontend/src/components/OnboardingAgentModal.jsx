import React, { useState, useEffect } from 'react';
import { HelpCircle, Sparkles, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiClient } from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const AGENT_CATEGORIES = {
  personal: {
    title_ru: 'Время и деньги',
    title_en: 'Time & Money',
    color: 'from-violet-500 to-purple-500',
    agents: [
      { id: 'secretary', name_ru: 'Тайм-Менеджер', name_en: 'Time-Manager', iconSrc: '/assets/icons/agents/секретарь.png', desc_ru: 'Секретарь-Планировщик: встречи, напоминания', desc_en: 'Secretary-Planner: meetings, reminders' },
      { id: 'accountant', name_ru: 'Финансовый-помощник', name_en: 'Accountant', iconSrc: '/assets/icons/agents/финансовый ассистент.png', desc_ru: 'Бюджет, расходы, финансы', desc_en: 'Budget, expenses, finance' },
    ]
  },
  health: {
    title_ru: 'Здоровье',
    title_en: 'Health',
    color: 'from-emerald-400 to-teal-500',
    agents: [
      { id: 'dietitian', name_ru: 'Диетолог', name_en: 'Dietitian', iconSrc: '/assets/icons/agents/диетолог.png', desc_ru: 'Рационы и планы питания', desc_en: 'Meal plans & nutrition' },
      { id: 'psychologist', name_ru: 'Психолог', name_en: 'Psychologist', iconSrc: '/assets/icons/agents/психолог.png', desc_ru: 'Поддержка и практики', desc_en: 'Support & self-care' },
    ]
  },
  growth: {
    title_ru: 'Развитие',
    title_en: 'Growth',
    color: 'from-amber-400 to-orange-500',
    agents: [
      { id: 'mentor', name_ru: 'Ментор', name_en: 'Mentor', iconSrc: '/assets/icons/agents/ментор.png', desc_ru: 'Цели, карьера, мотивация', desc_en: 'Goals, career, motivation' },
    ]
  },
};

export default function OnboardingAgentModal({ userId, isOpen, onComplete }) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeAgents, setActiveAgents] = useState(new Set(['secretary', 'accountant', 'dietitian', 'psychologist', 'mentor'])); // All enabled by default for onboarding

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

  const toggleAgent = (id) => {
    setActiveAgents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      const uid = userId || 1;
      await apiClient.put(`/api/user/${uid}/agent-settings`, {
        enabled_agents: [...activeAgents],
      });
      onComplete([...activeAgents]);
    } catch (err) {
      console.error('Failed to save agent settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const isRu = language === 'ru';

  return (
    <>
      <style>{`
        @keyframes agent-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .agent-icon-modal {
          animation: agent-float 1.5s ease-in-out infinite;
        }
        .agent-icon-modal:hover {
          animation-duration: 0.4s;
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="w-full max-w-md bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl flex flex-col max-h-[85vh]">
          {/* Scrollable content area */}
          <div className="overflow-y-auto px-6 pt-6 pb-2">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
                <Sparkles size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {isRu ? 'Выберите ваших агентов' : 'Choose your agents'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRu ? 'Соберите свою команду ИИ-помощников' : 'Build your AI assistant team'}
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(AGENT_CATEGORIES).map(([key, cat]) => (
                <div key={key} className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${cat.color}`} />
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRu ? cat.title_ru : cat.title_en}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {cat.agents.map((agent, index) => {
                      const isActive = activeAgents.has(agent.id);
                      return (
                        <label
                          key={agent.id}
                          className={`flex items-center gap-4 px-4 py-3 rounded-[3rem] transition-all cursor-pointer select-none ${
                            isActive
                              ? 'bg-background-light dark:bg-background-dark shadow-sm hover:scale-[1.01]'
                              : 'opacity-40 hover:opacity-60'
                          }`}
                        >
                          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 agent-icon-modal" style={{ animationDelay: `${index * 0.4}s` }}>
                            <img src={agent.iconSrc} alt="" className="w-12 h-12 object-contain" style={{ transform: 'scale(1.5)' }} />
                          </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-800 dark:text-white">
                                {isRu ? agent.name_ru : agent.name_en}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {isRu ? agent.desc_ru : agent.desc_en}
                              </div>
                            </div>
                            {/* Custom checkbox */}
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border-2 ${
                                isActive
                                  ? 'bg-green-500 border-green-500 shadow-md shadow-green-500/25'
                                  : 'border-gray-300 dark:border-gray-600 bg-transparent'
                              }`}
                            >
                              {isActive && <Sparkles size={15} className="text-white" strokeWidth={3} />}
                            </div>
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleAgent(agent.id)}
                              className="hidden"
                            />
                          </label>
                        );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="px-6 pb-6 pt-2">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mb-4" />
            <button
              onClick={handleComplete}
              disabled={saving || activeAgents.size === 0}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold text-base shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {isRu ? 'Сохранение...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {isRu ? 'Продолжить' : 'Continue'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
