import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Coffee, Camera, Briefcase, Coffee as WorkCoffee, Calendar } from 'lucide-react';

const getIconForActivity = (title) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('работа') || lowerTitle.includes('meeting') || lowerTitle.includes('встреча')) {
    return Briefcase;
  }
  if (lowerTitle.includes('еда') || lowerTitle.includes('прием пищи') || lowerTitle.includes('обед') || lowerTitle.includes('ужин')) {
    return Coffee;
  }
  if (lowerTitle.includes('съемки') || lowerTitle.includes('фото') || lowerTitle.includes('видео')) {
    return Camera;
  }
  if (lowerTitle.includes('отдых') || lowerTitle.includes('сон') || lowerTitle.includes('relax')) {
    return WorkCoffee;
  }
  return Calendar;
};

const ScheduleWidget = ({ data }) => {
  const { date, events, reminders } = data;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <div className="bg-white/10 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20 dark:border-gray-700/30">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Расписание на {date}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {events.length + reminders.length} записей
            </p>
          </div>
        </div>

        {/* Events Timeline */}
        {events.length > 0 && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Clock className="w-4 h-4" />
              <span>Расписание</span>
            </div>
            <div className="relative pl-6 border-l-2 border-blue-200 dark:border-blue-800">
              {events.map((event, index) => {
                const Icon = getIconForActivity(event.title);
                return (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="relative mb-4 last:mb-0"
                  >
                    <div className="absolute -left-8 top-1 w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full border-2 border-white dark:border-gray-900" />
                    <div className="bg-white/30 dark:bg-gray-700/30 rounded-xl p-4 backdrop-blur-sm hover:bg-white/40 dark:hover:bg-gray-700/40 transition-all duration-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {event.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {event.start_time} - {event.end_time}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reminders */}
        {reminders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>События и напоминания</span>
            </div>
            {reminders.map((reminder, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex items-center gap-3 bg-orange-50/50 dark:bg-orange-900/20 rounded-xl p-3 backdrop-blur-sm border border-orange-200/50 dark:border-orange-800/30"
              >
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-gray-900 dark:text-white text-sm">
                  {reminder.title}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {events.length === 0 && reminders.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="text-center py-8"
          >
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-600 dark:text-gray-400">
              На эту дату нет запланированных событий
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ScheduleWidget;
