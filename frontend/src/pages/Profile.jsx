import React from 'react';
import { User, Moon, Sun, CreditCard, Bell, LogOut, ArrowLeft } from 'lucide-react';

const Profile = ({ userProfile, theme, onThemeToggle, onBack }) => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Profile Settings
          </h1>
        </div>

        {/* Profile Section */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <User size={40} className="text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-1">
                {userProfile?.username || 'User'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {userProfile?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>

        {/* Tariff Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-[1.5rem] p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard size={24} />
            <h3 className="text-lg font-semibold">Current Plan</h3>
          </div>
          <div className="mb-2">
            <span className="text-sm opacity-90">Free Tier</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">Token Balance</div>
              <div className="text-3xl font-bold">
                {userProfile?.token_balance || 0}
              </div>
            </div>
            <button className="bg-white text-blue-600 px-4 py-2 rounded-xl font-medium hover:bg-blue-50 transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[1.5rem] p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
            Settings
          </h3>

          {/* General Settings */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
              General
            </h4>
            
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between py-3">
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

          {/* Notifications Settings */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
              Notifications
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Bell size={20} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Email Notifications
                  </span>
                </div>
                <button
                  className={`relative w-14 h-7 rounded-full transition-colors bg-gray-300`}
                >
                  <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Bell size={20} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Push Notifications
                  </span>
                </div>
                <button
                  className={`relative w-14 h-7 rounded-full transition-colors bg-gray-300`}
                >
                  <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Bell size={20} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Task Reminders
                  </span>
                </div>
                <button
                  className={`relative w-14 h-7 rounded-full transition-colors bg-blue-500`}
                >
                  <div className="absolute top-1 left-8 w-5 h-5 bg-white rounded-full shadow-md transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-[1.5rem] transition-colors font-medium">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Profile;
