import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  ru: {
    // Sidebar
    agents: 'Агенты',
    yourChats: 'Ваши диалоги с Agents',
    noChats: 'Нет диалогов',
    secretary: 'Secretary',
    accountant: 'Accountant',
    secretaryDesc: 'Персональный ассистент для планирования и организации',
    accountantDesc: 'Финансовый ассистент для бюджета и расходов',
    
    // Home
    chatWithAgents: 'Chat with Agents',
    
    // Delete Modal
    deleteChat: 'Удалить диалог?',
    deleteChatConfirm: 'Вы точно хотите удалить этот диалог? Это действие нельзя отменить.',
    cancel: 'Отмена',
    delete: 'Удалить',
    
    // Header
    agents: 'Agents',
    
    // Theme
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
    
    // Profile
    profileSettings: 'Настройки профиля',
    currentPlan: 'Текущий план',
    freeTier: 'Бесплатный тариф',
    tokenBalance: 'Баланс токенов',
    upgradePlan: 'Улучшить план',
    settings: 'Настройки',
    general: 'Общие',
    lightMode: 'Светлая тема',
    darkMode: 'Темная тема',
    notifications: 'Уведомления',
    emailNotifications: 'Email уведомления',
    pushNotifications: 'Push уведомления',
    taskReminders: 'Напоминания о задачах',
    logout: 'Выйти',
    language: 'Язык',
    switchLanguage: 'Переключить язык',
  },
  en: {
    // Sidebar
    agents: 'Agents',
    yourChats: 'Your chats with Agents',
    noChats: 'No chats',
    secretary: 'Secretary',
    accountant: 'Accountant',
    secretaryDesc: 'Personal assistant for scheduling and organization',
    accountantDesc: 'Financial assistant for budgeting and expenses',
    
    // Home
    chatWithAgents: 'Chat with Agents',
    
    // Delete Modal
    deleteChat: 'Delete chat?',
    deleteChatConfirm: 'Are you sure you want to delete this chat? This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    
    // Header
    agents: 'Agents',
    
    // Theme
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
    
    // Profile
    profileSettings: 'Profile Settings',
    currentPlan: 'Current Plan',
    freeTier: 'Free Tier',
    tokenBalance: 'Token Balance',
    upgradePlan: 'Upgrade Plan',
    settings: 'Settings',
    general: 'General',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    notifications: 'Notifications',
    emailNotifications: 'Email Notifications',
    pushNotifications: 'Push Notifications',
    taskReminders: 'Task Reminders',
    logout: 'Logout',
    language: 'Language',
    switchLanguage: 'Switch Language',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
