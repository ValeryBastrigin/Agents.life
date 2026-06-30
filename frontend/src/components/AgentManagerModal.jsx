import React, { useState } from 'react';
import { HelpCircle, ArrowLeft, Check, Sparkles, Users, Brain, Target, Heart, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const AGENT_CATEGORIES = {
  personal: {
    title_ru: 'Время и деньги',
    title_en: 'Time & Money',
    color: 'from-violet-500 to-purple-500',
    agents: [
{ id: 'secretary', name_ru: 'Тайм-Менеджер', name_en: 'Time-Manager', icon: '📅', desc_ru: 'Секретарь-Планировщик: встречи, напоминания', desc_en: 'Secretary-Planner: meetings, reminders' },
      { id: 'accountant', name_ru: 'Бухгалтер', name_en: 'Accountant', icon: '💰', desc_ru: 'Бюджет, расходы, финансы', desc_en: 'Budget, expenses, finance' },
    ]
  },
  health: {
    title_ru: 'Здоровье',
    title_en: 'Health',
    color: 'from-emerald-400 to-teal-500',
    agents: [
      { id: 'dietitian', name_ru: 'Диетолог', name_en: 'Dietitian', icon: '🥗', desc_ru: 'Рационы и планы питания', desc_en: 'Meal plans & nutrition' },
      { id: 'psychologist', name_ru: 'Психолог', name_en: 'Psychologist', icon: '🧠', desc_ru: 'Поддержка и практики', desc_en: 'Support & self-care' },
    ]
  },
  growth: {
    title_ru: 'Развитие',
    title_en: 'Growth',
    color: 'from-amber-400 to-orange-500',
    agents: [
      { id: 'mentor', name_ru: 'Ментор', name_en: 'Mentor', icon: '🎯', desc_ru: 'Цели, карьера, мотивация', desc_en: 'Goals, career, motivation' },
    ]
  },
};

export default function AgentManagerModal({ onClose, onAgentsChange }) {
  const { language } = useLanguage();
  const [showGuide, setShowGuide] = useState(false);
  const [activeAgents, setActiveAgents] = useState(() => {
    const all = [];
    Object.values(AGENT_CATEGORIES).forEach(cat => {
      cat.agents.forEach(a => all.push(a.id));
    });
    return new Set(all);
  });

  const toggleAgent = (id) => {
    setActiveAgents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (onAgentsChange) onAgentsChange([...activeAgents]);
    onClose();
  };

  const isRu = language === 'ru';

  // ---- GUIDE VIEW ----
  if (showGuide) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl flex flex-col max-h-[85vh]">
          {/* Scrollable content */}
          <div className="overflow-y-auto px-6 pt-6 pb-2">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-[3rem] transition-colors">
                <ArrowLeft size={22} className="text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {isRu ? '💡 Об агентах' : '💡 About Agents'}
              </h2>
            </div>

            {/* Intro */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-5 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {isRu
                  ? 'Агенты — это ИИ-помощники, каждый из которых специализируется в своей области. Они помогают вам организовать жизнь, следить за здоровьем, финансами и развитием — как личная команда экспертов.'
                  : 'Agents are AI assistants, each specialized in their own field. They help you organize life, track health, finances and growth — like a personal team of experts.'
                }
              </p>
            </div>

            {/* Benefits */}
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
              {isRu ? 'Как агенты улучшат вашу жизнь' : 'How agents improve your life'}
            </h3>
            <div className="space-y-3">
              {[
                { icon: Users, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30', title_ru: 'Делегирование', title_en: 'Delegation', desc_ru: 'Передайте рутину агентам — освободите время для важного', desc_en: 'Hand off routine to agents — free up time for what matters' },
                { icon: Brain, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', title_ru: 'Экспертиза 24/7', title_en: '24/7 Expertise', desc_ru: 'Профессиональные советы в любое время дня и ночи', desc_en: 'Professional advice anytime, day or night' },
                { icon: Target, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', title_ru: 'Фокус на целях', title_en: 'Goal Focus', desc_ru: 'Агенты помнят ваши цели и помогают к ним идти', desc_en: 'Agents remember your goals and help you reach them' },
                { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30', title_ru: 'Забота о себе', title_en: 'Self-care', desc_ru: 'Здоровье, питание и ментальное состояние под контролем', desc_en: 'Health, nutrition and mental wellbeing under control' },
                { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', title_ru: 'Постоянный рост', title_en: 'Continuous Growth', desc_ru: 'Ежедневные шаги к лучшей версии себя', desc_en: 'Daily steps toward a better version of yourself' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 bg-surface-light dark:bg-surface-dark rounded-[3rem] p-4">
                  <div className={`w-11 h-11 rounded-[2rem] ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    <item.icon size={22} className={item.color} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-white text-sm">
                      {isRu ? item.title_ru : item.title_en}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {isRu ? item.desc_ru : item.desc_en}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="px-6 pb-6 pt-2">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mb-4" />
            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-3 rounded-[3rem] bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              {isRu ? 'Понятно, выбрать агентов' : 'Got it, choose agents'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- MAIN VIEW ----
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl flex flex-col max-h-[85vh]">
        {/* Scrollable content area */}
        <div className="overflow-y-auto px-6 pt-6 pb-2">
          {/* Header row: title left, ? right */}
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white leading-tight">
              {isRu ? 'Выберите ваших агентов' : 'Choose your agents'}
            </h2>
            <button
              onClick={() => setShowGuide(true)}
              className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-[3rem] transition-colors flex-shrink-0 ml-3"
              title={isRu ? 'Что такое агенты?' : 'What are agents?'}
            >
              <HelpCircle size={22} className="text-gray-500 dark:text-gray-400" />
            </button>
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
                  {cat.agents.map(agent => {
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
                        <div className={`w-12 h-12 rounded-[2rem] bg-gradient-to-br ${cat.color} flex items-center justify-center text-xl flex-shrink-0`}>
                          {agent.icon}
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
                          {isActive && <Check size={15} className="text-white" strokeWidth={3} />}
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

        {/* Sticky footer — separated by decorative gradient line */}
        <div className="px-6 pb-6 pt-2">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mb-4" />
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-[3rem] bg-surface-light dark:bg-surface-dark text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              {isRu ? 'Отмена' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 rounded-[3rem] bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
            >
              {isRu ? 'Готово' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}