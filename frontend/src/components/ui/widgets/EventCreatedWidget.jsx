import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Bell } from 'lucide-react';

const EventCreatedWidget = ({ data }) => {
  const { title, date, time, kind } = data;

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: { delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200 }
    }
  };

  const detailVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { delay: 0.3, duration: 0.3 }
    }
  };

  const isEvent = kind === 'event';
  const Icon = isEvent ? Calendar : Bell;
  const bgGradient = isEvent
    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
    : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20';
  const borderColor = isEvent
    ? 'border-emerald-200/50 dark:border-emerald-700/30'
    : 'border-blue-200/50 dark:border-blue-700/30';
  const iconBg = isEvent
    ? 'bg-emerald-100 dark:bg-emerald-900/40'
    : 'bg-blue-100 dark:bg-blue-900/40';
  const iconColor = isEvent
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-blue-600 dark:text-blue-400';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <div className={`${bgGradient} backdrop-blur-xl rounded-[2.5rem] p-5 shadow-xl border ${borderColor}`}>
        {/* Success Header */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            variants={iconVariants}
            className="p-2 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-600"
          >
            <CheckCircle className="w-5 h-5 text-white" />
          </motion.div>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Запись создана
          </span>
        </div>

        {/* Event Details */}
        <motion.div
          variants={detailVariants}
          className="flex items-start gap-4"
        >
          <div className={`p-3 rounded-[2rem] ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
              {title}
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{date}</span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span>{time}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EventCreatedWidget;