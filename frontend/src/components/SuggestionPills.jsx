import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/apiClient';

// userId добавляется к ключу, чтобы изолировать dismissed-состояние между аккаунтами
const STORAGE_DISMISS_PREFIX = 'suggestion_pill_dismissed_';
const AGENTS_CHANGED_EVENT = 'agents-changed';

const PILLS_CONFIG = [
  {
    id: 'what_can_you_do',
    text: 'Что ты умеешь?',
    agentRequired: null,
    color: 'from-[#6366f1] to-[#8b5cf6]',
    bgLight: 'bg-gray-200',
    bgDark: 'dark:bg-gray-700',
    borderLight: 'border-transparent',
    borderDark: 'dark:border-transparent',
    textLight: 'text-gray-700',
    textDark: 'dark:text-gray-200',
    icon: '/assets/icons/agents/ixteria.svg',
    iconFilter: 'none',
    action: 'send_message',
    actionPayload: null,
  },
  {
    id: 'start_therapy',
    text: 'Начать сеанс психотерапии',
    agentRequired: 'psychologist',
    color: 'from-[#a855f7] to-[#ec4899]',
    bgLight: 'bg-[#f3e8ff]',
    bgDark: 'dark:bg-[#3b0764]',
    borderLight: 'border-transparent',
    borderDark: 'dark:border-transparent',
    textLight: 'text-gray-700',
    textDark: 'dark:text-gray-200',
    icon: '/assets/icons/agents/психолог.svg',
    iconFilter: 'none',
    action: 'navigate_and_show_modal',
    actionPayload: { path: '/psychologist', modalState: { showStartSession: true } },
  },
  {
    id: 'meal_plan',
    text: 'Составить индивидуальный план питания',
    agentRequired: 'dietitian',
    color: 'from-[#34d399] to-[#14b8a6]',
    bgLight: 'bg-[#d1fae5]',
    bgDark: 'dark:bg-[#064e3b]',
    borderLight: 'border-transparent',
    borderDark: 'dark:border-transparent',
    textLight: 'text-gray-700',
    textDark: 'dark:text-gray-200',
    icon: '/assets/icons/agents/диетолог.svg',
    iconFilter: 'none',
    action: 'navigate',
    actionPayload: '/dietitian/plan',
  },
  {
    id: 'schedule_meeting',
    text: 'Составить расписание, запланировать встречу',
    agentRequired: 'secretary',
    color: 'from-[#60a5fa] to-[#06b6d4]',
    bgLight: 'bg-[#dbeafe]',
    bgDark: 'dark:bg-[#1e3a5f]',
    borderLight: 'border-transparent',
    borderDark: 'dark:border-transparent',
    textLight: 'text-gray-700',
    textDark: 'dark:text-gray-200',
    icon: '/assets/icons/agents/секретарь.svg',
    iconFilter: 'none',
    action: 'navigate',
    actionPayload: '/secretary',
  },
  {
    id: 'dream_path',
    text: 'Создайте путь к своей мечте',
    agentRequired: 'mentor',
    color: 'from-[#fbbf24] to-[#f97316]',
    bgLight: 'bg-[#fef3c7]',
    bgDark: 'dark:bg-[#451a03]',
    borderLight: 'border-transparent',
    borderDark: 'dark:border-transparent',
    textLight: 'text-gray-700',
    textDark: 'dark:text-gray-200',
    icon: '/assets/icons/agents/ментор.svg',
    iconFilter: 'none',
    action: 'navigate_and_show_modal',
    actionPayload: { path: '/mentor', modalState: { showDreamModal: true } },
  },
  {
    id: 'financial_analysis',
    text: 'Сделать анализ банковской выписки или портфеля',
    agentRequired: 'accountant',
    color: 'from-[#8b5cf6] to-[#6366f1]',
    bgLight: 'bg-[#ede9fe]',
    bgDark: 'dark:bg-[#2e1065]',
    borderLight: 'border-transparent',
    borderDark: 'dark:border-transparent',
    textLight: 'text-gray-700',
    textDark: 'dark:text-gray-200',
    icon: '/assets/icons/agents/бухгалтер.svg',
    iconFilter: 'none',
    action: 'navigate',
    actionPayload: '/financial-analyst',
  },
];

const SuggestionPills = ({ onSendMessage, userId, isNewChat }) => {
  const navigate = useNavigate();
  const [activeAgents, setActiveAgents] = useState(new Set());
  const getStorageKey = useCallback((pillId) => {
    return `${STORAGE_DISMISS_PREFIX}${pillId}_user_${userId || 'anonymous'}`;
  }, [userId]);

  const [dismissedPills, setDismissedPills] = useState(() => {
    // Начальное состояние будет заполнено в useEffect после загрузки userId
    return {};
  });
  const loadActiveAgents = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiClient.get(`/api/user/${userId}/agent-settings`);
      const settings = res.data;
      const enabled = new Set(
        settings.filter(s => s.is_enabled).map(s => s.agent_name)
      );
      setActiveAgents(enabled);
    } catch (err) {
      console.error('Failed to load agent settings for pills:', err);
      setActiveAgents(new Set(['secretary', 'accountant', 'dietitian', 'psychologist', 'mentor']));
    }
  }, [userId]);

  // Загружаем dismissed состояние после того, как userId известен
  useEffect(() => {
    const dismissed = {};
    PILLS_CONFIG.forEach(pill => {
      try {
        if (localStorage.getItem(getStorageKey(pill.id))) {
          dismissed[pill.id] = true;
        }
      } catch (e) {}
    });
    setDismissedPills(dismissed);
  }, [getStorageKey]);

  useEffect(() => {
    loadActiveAgents();
  }, [loadActiveAgents]);

  useEffect(() => {
    const handleAgentsChanged = () => {
      loadActiveAgents();
    };
    window.addEventListener(AGENTS_CHANGED_EVENT, handleAgentsChanged);
    return () => window.removeEventListener(AGENTS_CHANGED_EVENT, handleAgentsChanged);
  }, [loadActiveAgents]);

  const dismissPill = useCallback((pillId, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      localStorage.setItem(getStorageKey(pillId), 'true');
    } catch (e) {}
    setDismissedPills(prev => ({ ...prev, [pillId]: true }));
  }, [getStorageKey]);

  const handlePillClick = useCallback((pill) => {
    // Dismiss this single pill when clicked (одноразовые)
    try {
      localStorage.setItem(getStorageKey(pill.id), 'true');
    } catch (e) {}
    setDismissedPills(prev => ({ ...prev, [pill.id]: true }));
    switch (pill.action) {
      case 'send_message':
        if (onSendMessage) onSendMessage(pill.text);
        break;
      case 'navigate':
        navigate(pill.actionPayload);
        break;
      case 'navigate_and_show_modal':
        navigate(pill.actionPayload.path, { state: pill.actionPayload.modalState });
        break;
      default:
        break;
    }
  }, [onSendMessage, navigate, getStorageKey]);

  if (!isNewChat) return null;

  const visiblePills = PILLS_CONFIG
    .filter(pill => !dismissedPills[pill.id])
    .filter(pill => {
      if (pill.agentRequired === null) return true;
      return activeAgents.has(pill.agentRequired);
    })
    .sort((a, b) => a.text.length - b.text.length);

  if (visiblePills.length === 0) return null;

  return (
    <div className="mb-3 px-1 flex flex-wrap gap-2">
      {visiblePills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => handlePillClick(pill)}
          className={`
            group relative flex items-center gap-2 px-3 py-1.5 rounded-full
            ${pill.bgLight} ${pill.bgDark}
            border ${pill.borderLight} ${pill.borderDark}
            shadow-sm hover:shadow-md
            transition-all duration-200 active:scale-[0.97]
            ${pill.textLight} ${pill.textDark}
            text-xs font-medium cursor-pointer whitespace-nowrap
          `}
        >
          <img
            src={pill.icon}
            alt=""
            className="w-4 h-4 object-contain flex-shrink-0"
            style={{ filter: pill.iconFilter }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="leading-tight py-0.5">
            {pill.text}
          </span>
          <span
            onClick={(e) => dismissPill(pill.id, e)}
            className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-400/30 hover:bg-gray-500/40 dark:bg-white/20 dark:hover:bg-white/30 flex items-center justify-center transition-colors ml-0.5"
          >
            <X size={10} className="text-gray-500 dark:text-white/70" />
          </span>
        </button>
      ))}
    </div>
  );
};

export default SuggestionPills;