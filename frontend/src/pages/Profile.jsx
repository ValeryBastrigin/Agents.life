import React, { useRef, useState, useEffect } from 'react';
import { User, Moon, Sun, Bell, LogOut, ArrowLeft, Globe, Bot, Edit2, Check, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiClient } from '../utils/apiClient';
import BillingPlans from '../components/BillingPlans';
import PaywallModal from '../components/PaywallModal';
import UpgradePlanModal from '../components/UpgradePlanModal';
import AnimatedBackground from '../components/AnimatedBackground';
import AgentManagerModal from '../components/AgentManagerModal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

function resolveUploadUrl(url) {
  if (!url) return url;
  if (url.startsWith('/uploads/')) {
    return `${API_URL}${url}`;
  }
  return url;
}

const Profile = ({ userProfile, theme, onThemeToggle, onBack, onLogout, setUserProfile }) => {
  const { t, language, changeLanguage } = useLanguage();
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const [upgradePlanOpen, setUpgradePlanOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [agentManagerOpen, setAgentManagerOpen] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(userProfile?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    if (!scrollRef.current) return;
    const blocked = upgradePlanOpen || paywallOpen || agentManagerOpen;
    scrollRef.current.style.overflow = blocked ? 'hidden' : '';
    scrollRef.current.style.position = blocked ? 'relative' : '';
  }, [upgradePlanOpen, paywallOpen, agentManagerOpen]);

  useEffect(() => {
    setUsernameInput(userProfile?.username || '');
  }, [userProfile?.username]);

  const handleUpgrade = (planId) => {
    setUpgradePlanOpen(false);
    console.log('Upgrade to', planId);
  };

  const handlePaywallSelect = (planId) => {
    setPaywallOpen(false);
    console.log('Paywall select', planId);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(`/api/user/${userProfile?.id || 1}/avatar`, formData);
      const avatarUrl = res.data.url;
      window.dispatchEvent(new CustomEvent('avatar-changed', { detail: avatarUrl }));
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    }
  };

  const handleUsernameSave = async () => {
    if (!usernameInput.trim()) {
      setUsernameError('Имя не может быть пустым');
      return;
    }

    try {
      setSavingUsername(true);
      const res = await apiClient.put(`/api/user/${userProfile?.id || 1}/username`, {
        username: usernameInput.trim()
      });
      setUsernameError('');
      setEditingUsername(false);
      // Update local profile state
      if (setUserProfile && userProfile) {
        setUserProfile({
          ...userProfile,
          username: usernameInput.trim()
        });
      }
    } catch (err) {
      console.error('Failed to update username:', err);
      setUsernameError('Не удалось обновить имя');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleUsernameCancel = () => {
    setUsernameInput(userProfile?.username || '');
    setUsernameError('');
    setEditingUsername(false);
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 animate-slide-in-right relative">
      <AnimatedBackground theme={theme} />
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            {t('profileSettings')}
          </h1>
        </div>

        {/* Profile Section */}
        <div className="bg-white dark:bg-surface-dark rounded-[3.5rem] p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => fileInputRef.current?.click()}
              title="Нажмите, чтобы изменить аватар"
            >
              {userProfile?.avatar_url ? (
                <img
                  src={resolveUploadUrl(userProfile.avatar_url)}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center ${userProfile?.avatar_url ? 'hidden' : ''}`}
              >
                <User size={40} className="text-blue-500 dark:text-blue-400" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
            <div className="flex-1">
              {editingUsername ? (
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => { setUsernameInput(e.target.value); setUsernameError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUsernameSave(); if (e.key === 'Escape') handleUsernameCancel(); }}
                      className="w-full px-3 py-2 pr-20 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      disabled={savingUsername}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={handleUsernameSave}
                        disabled={savingUsername}
                        className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Сохранить"
                      >
                        {savingUsername ? (
                          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check size={16} className="text-green-600 dark:text-green-400" />
                        )}
                      </button>
                      <button
                        onClick={handleUsernameCancel}
                        disabled={savingUsername}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                        title="Отмена"
                      >
                        <X size={16} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white">
                    {userProfile?.display_name || userProfile?.username || 'User'}
                  </h2>
                  <button
                    onClick={() => setEditingUsername(true)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Изменить имя"
                  >
                    <Edit2 size={16} className="text-gray-400 dark:text-gray-500" />
                  </button>
                </div>
              )}
              {usernameError && (
                <p className="text-red-500 text-sm mb-1">{usernameError}</p>
              )}
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                {userProfile?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>

        {/* Billing Plans — Usage Bar + Tariff Cards */}
        <BillingPlans
          userProfile={userProfile}
          onUpgrade={() => setUpgradePlanOpen(true)}
          onPaywall={() => setPaywallOpen(true)}
        />

        <UpgradePlanModal
          isOpen={upgradePlanOpen}
          onClose={() => setUpgradePlanOpen(false)}
          onSelectPlan={handleUpgrade}
        />

        <PaywallModal
          isOpen={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          onSelectPlan={handlePaywallSelect}
        />

        {/* Settings Section */}
        <div className="bg-white dark:bg-surface-dark rounded-[3.5rem] p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
            {t('settings')}
          </h3>

          {/* General Settings */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
              {t('general')}
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
                  {theme === 'light' ? t('lightMode') : t('darkMode')}
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

            {/* Language Toggle */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('language')}
                </span>
              </div>
              <button
                onClick={() => changeLanguage(language === 'ru' ? 'en' : 'ru')}
                className="flex items-center gap-2 px-4 py-2 rounded-[3rem] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'ru' ? 'RU' : 'EN'}
                </span>
              </button>
            </div>
          </div>

          {/* Agent Settings */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
              Агенты
            </h4>

            <button
              onClick={() => setAgentManagerOpen(true)}
              className="w-full flex items-center justify-between py-3 px-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Bot size={20} className="text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  Настроить агентов
                </span>
              </div>
              <span className="text-sm text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                Кто доступен в чатах →
              </span>
            </button>
          </div>

          {/* Notifications Settings */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
              {t('notifications')}
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Bell size={20} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('emailNotifications')}
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
                    {t('pushNotifications')}
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
                    {t('taskReminders')}
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

        {/* Agent Manager Modal */}
        {agentManagerOpen && (
          <AgentManagerModal
            onClose={() => setAgentManagerOpen(false)}
            userId={userProfile?.id || 1}
          />
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-[3.5rem] transition-colors font-medium"
        >
          <LogOut size={20} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
};

export default Profile;