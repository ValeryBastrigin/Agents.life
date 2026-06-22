import React from 'react';
import { X, User, Moon, Sun } from 'lucide-react';

const ProfileModal = ({ isOpen, onClose, userProfile, onThemeToggle, theme }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background-light dark:bg-background-dark rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Account Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profile Section */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <User size={32} className="text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                {userProfile?.username || 'User'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userProfile?.email || 'user@example.com'}
              </p>
            </div>
          </div>

          {/* Token Balance */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 mb-6">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Token Balance
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              {userProfile?.token_balance || 0} tokens
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'light' ? (
                <Sun size={20} className="text-gray-600 dark:text-gray-400" />
              ) : (
                <Moon size={20} className="text-gray-600 dark:text-gray-400" />
              )}
              <span className="text-gray-700 dark:text-gray-300">
                {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </div>
            <button
              onClick={onThemeToggle}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                  theme === 'dark' ? 'left-8' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
