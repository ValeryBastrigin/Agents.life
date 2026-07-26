import React, { useState } from 'react';
import { X, Trash2, Bell, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENT_ICONS = {
  secretary: '/assets/icons/agents/секретарь.png',
  accountant: '/assets/icons/agents/финансовый ассистент.png',
  dietitian: '/assets/icons/agents/диетолог.png',
  psychologist: '/assets/icons/agents/психолог.png',
  mentor: '/assets/icons/agents/ментор.png',
  ixteria: '/assets/icons/agents/ixteria.svg'
};

const AGENT_NAMES = {
  secretary: 'Тайм-Менеджер',
  accountant: 'Финансовый помощник',
  dietitian: 'Диетолог',
  psychologist: 'Психолог',
  mentor: 'Ментор',
  ixteria: 'Ixteria Orchestrator'
};

export default function NotificationModal({ isOpen, onClose, notifications, onClearAll, onDeleteNotification }) {
  const [isClearing, setIsClearing] = useState(false);

  if (!isOpen) return null;

  const handleClearWithAnimation = () => {
    setIsClearing(true);
    setTimeout(() => {
      onClearAll();
      setIsClearing(false);
    }, 400); // match animation duration
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-lg bg-background-light dark:bg-background-dark rounded-[3rem] shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          {/* Left: Red trash button with animation */}
          <button
            onClick={handleClearWithAnimation}
            disabled={notifications.length === 0}
            className={`p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center ${isClearing ? 'animate-bounce scale-90 rotate-12' : ''}`}
            title="Очистить все уведомления"
          >
            <Trash2 size={18} className={`transition-transform duration-300 ${isClearing ? 'rotate-45 scale-110' : ''}`} />
          </button>

          {/* Title in center */}
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Уведомления</h2>
            {notifications.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>

          {/* Right: Close (X) button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-400">
                  <Bell size={32} />
                </div>
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Нет новых уведомлений</h3>
                <p className="text-xs text-gray-400">Здесь будут появляться важные события и напоминания от ваших ИИ-агентов.</p>
              </motion.div>
            ) : (
              notifications.map((item) => {
                const agentKey = item.agent || 'ixteria';
                const iconSrc = AGENT_ICONS[agentKey] || AGENT_ICONS.ixteria;
                const agentTitle = AGENT_NAMES[agentKey] || 'Агент';

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-4 p-4 rounded-[2rem] bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow relative group"
                  >
                    {/* Agent Icon: doubled size (w-20 h-20), no container, rocking animation */}
                    <div className="shrink-0 flex items-center justify-center pt-1">
                      <motion.img 
                        src={iconSrc} 
                        alt={agentTitle} 
                        className="w-20 h-20 object-contain drop-shadow-sm select-none"
                        animate={{ rotate: [-4, 4, -4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          {agentTitle}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock size={10} />
                          {item.time || 'Только что'}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Delete single notification button */}
                    <button
                      onClick={() => onDeleteNotification(item.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500"
                      title="Удалить уведомление"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 text-center bg-gray-50/50 dark:bg-gray-800/20">
          <p className="text-[11px] text-gray-400">
            Уведомления автоматически синхронизируются со всеми агентами Ixteria
          </p>
        </div>
      </div>
    </div>
  );
}
