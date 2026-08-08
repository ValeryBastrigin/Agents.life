import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const AGENT_COLORS = {
  ixteria: 'from-indigo-500 to-purple-500',
  psychologist: 'from-pink-500 to-rose-500',
  dietitian: 'from-green-500 to-emerald-500',
  secretary: 'from-blue-500 to-cyan-500',
  mentor: 'from-amber-500 to-orange-500',
  accountant: 'from-violet-500 to-purple-500',
};

const AGENT_ICONS = {
  ixteria: '/assets/icons/agents/ixteria.svg',
  psychologist: '/assets/icons/agents/psychologist.svg',
  dietitian: '/assets/icons/agents/dietitian.svg',
  secretary: '/assets/icons/agents/secretary.svg',
  mentor: '/assets/icons/agents/mentor.svg',
  accountant: '/assets/icons/agents/accountant.svg',
};

const HINTS = [
  {
    id: 'what-can-you-do',
    text: 'Что ты умеешь?',
    agent: 'ixteria',
    action: 'chat',
    message: 'Что ты умеешь делать? Расскажи о возможностях агентов.',
  },
  {
    id: 'therapy-session',
    text: 'Начать сеанс психотерапии',
    agent: 'psychologist',
    action: 'navigate',
    path: '/psychologist',
    openModal: 'therapy-start',
  },
  {
    id: 'meal-plan',
    text: 'Составить индивидуальный план питания',
    agent: 'dietitian',
    action: 'navigate',
    path: '/dietitian/plan',
  },
  {
    id: 'schedule',
    text: 'Составить расписание, запланировать встречу',
    agent: 'secretary',
    action: 'navigate',
    path: '/secretary',
  },
  {
    id: 'dream-path',
    text: 'Создайте путь к своей мечте',
    agent: 'mentor',
    action: 'navigate',
    path: '/mentor',
    openModal: 'dream-path',
  },
  {
    id: 'financial-analysis',
    text: 'Сделать анализ банковской выписки или портфеля',
    agent: 'accountant',
    action: 'navigate',
    path: '/accountant/analysis',
  },
];

function QuickHints({ onHintClick, userId, navigate, enabledAgents }) {
  const [visibleHints, setVisibleHints] = useState(() => {
    const saved = localStorage.getItem(`quickHints_${userId}`);
    return saved ? JSON.parse(saved) : HINTS.map(h => h.id);
  });

  const [dismissedAll, setDismissedAll] = useState(false);

  useEffect(() => {
    localStorage.setItem(`quickHints_${userId}`, JSON.stringify(visibleHints));
  }, [visibleHints, userId]);

  const handleDismiss = (e, hintId) => {
    e.stopPropagation();
    setVisibleHints(prev => prev.filter(id => id !== hintId));
  };

  const handleHintClick = (hint) => {
    setVisibleHints(prev => prev.filter(id => id !== hint.id));
    
    if (hint.action === 'chat') {
      onHintClick(hint.message);
    } else if (hint.action === 'navigate') {
      navigate(hint.path);
      if (hint.openModal) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: hint.openModal } }));
        }, 100);
      }
    }
  };

  // Filter hints: show only enabled agents + always show "What can you do" (ixteria)
  const activeHints = HINTS.filter(h => {
    // Always show "What can you do" (ixteria)
    if (h.agent === 'ixteria') return true;
    // Show only if agent is enabled
    return enabledAgents.includes(h.agent);
  }).filter(h => visibleHints.includes(h.id));
  
  // Sort by length (longer = lower)
  const sortedHints = [...activeHints].sort((a, b) => a.text.length - b.text.length);

  if (sortedHints.length === 0 || dismissedAll) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 mb-3 px-4">
      {sortedHints.map((hint) => (
        <div
          key={hint.id}
          onClick={() => handleHintClick(hint)}
          className="group relative flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-r from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 backdrop-blur-sm border border-white/20 dark:border-gray-600/20 shadow-sm hover:shadow-md"
        >
          {/* Agent icon */}
          <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${AGENT_COLORS[hint.agent]} flex items-center justify-center`}>
            <img
              src={AGENT_ICONS[hint.agent]}
              alt={hint.agent}
              className="w-4 h-4 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          
          {/* Text */}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {hint.text}
          </span>
          
          {/* Close button */}
          <button
            onClick={(e) => handleDismiss(e, hint.id)}
            className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X size={12} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default QuickHints;
