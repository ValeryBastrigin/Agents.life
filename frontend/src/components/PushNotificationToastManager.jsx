import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Zap } from 'lucide-react';

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

export default function PushNotificationToastManager({ toasts, onDismiss }) {
  useEffect(() => {
    if (toasts && toasts.length > 0) {
      const timer = setTimeout(() => {
        onDismiss(toasts[0].id);
      }, 5000); // auto dismiss after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [toasts, onDismiss]);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const agentKey = toast.agent || 'ixteria';
          const iconSrc = AGENT_ICONS[agentKey] || AGENT_ICONS.ixteria;
          const agentTitle = AGENT_NAMES[agentKey] || 'Агент';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-[2rem] p-4 shadow-2xl border border-purple-500/30 dark:border-purple-500/30 flex items-start gap-3 relative overflow-hidden group"
            >
              {/* Important badge indicator */}
              <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-indigo-600 text-white text-[9px] font-bold px-3 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-sm">
                <Zap size={10} className="text-yellow-300 fill-yellow-300 animate-pulse" />
                Важный Push
              </div>

              {/* Agent Icon */}
              <div className="shrink-0 flex items-center justify-center pt-1">
                <motion.img 
                  src={iconSrc} 
                  alt={agentTitle} 
                  className="w-12 h-12 object-contain drop-shadow-sm select-none"
                  animate={{ rotate: [-3, 3, -3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    {agentTitle}
                  </span>
                  <span className="text-[10px] text-gray-400">• {toast.time || 'Только что'}</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-1 leading-tight">
                  {toast.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => onDismiss(toast.id)}
                className="absolute top-3 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors p-1 rounded-full"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
