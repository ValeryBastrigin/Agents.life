import React from 'react';
import { Calendar, Clock, FileText, Bell } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Secretary = () => {
  const { t } = useLanguage();

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-400">
            {t('secretaryWelcome')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button className="flex flex-col items-center p-6 bg-surface-light dark:bg-surface-dark rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <Calendar size={32} className="text-blue-500 mb-2" />
            <span className="font-medium text-gray-800 dark:text-white">{t('calendar')}</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-surface-light dark:bg-surface-dark rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <Clock size={32} className="text-green-500 mb-2" />
            <span className="font-medium text-gray-800 dark:text-white">{t('reminders')}</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-surface-light dark:bg-surface-dark rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <FileText size={32} className="text-purple-500 mb-2" />
            <span className="font-medium text-gray-800 dark:text-white">{t('notes')}</span>
          </button>
        </div>

        {/* Upcoming Events */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={20} className="text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {t('upcomingEvents')}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-background-light dark:bg-background-dark rounded-xl">
              <div className="w-2 h-12 bg-blue-500 rounded-full" />
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white">{t('teamMeeting')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('today2pm')}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-background-light dark:bg-background-dark rounded-xl">
              <div className="w-2 h-12 bg-green-500 rounded-full" />
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white">{t('projectDeadline')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('tomorrow5pm')}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-background-light dark:bg-background-dark rounded-xl">
              <div className="w-2 h-12 bg-purple-500 rounded-full" />
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white">{t('clientCall')}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('friday10am')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Secretary;
