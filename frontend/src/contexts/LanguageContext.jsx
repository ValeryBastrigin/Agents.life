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

    // Chat Options
    chatOptions: 'Опции диалога',
    share: 'Поделиться',
    rename: 'Переименовать',
    pin: 'Закрепить',
    unpin: 'Открепить',
    deleteChatOption: 'Удалить',
    renameChat: 'Переименовать диалог',
    enterNewTitle: 'Введите новое название',
    save: 'Сохранить',
    
    // Header
    agents: 'Агенты',
    
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

    // Secretary
    secretaryWelcome: 'Управляйте своим расписанием, напоминаниями и задачами эффективно.',
    calendar: 'Календарь',
    reminders: 'Напоминания',
    notes: 'Заметки',
    upcomingEvents: 'Предстоящие события',
    teamMeeting: 'Встреча команды',
    today2pm: 'Сегодня, 14:00',
    projectDeadline: 'Дедлайн проекта',
    tomorrow5pm: 'Завтра, 17:00',
    clientCall: 'Звонок клиенту',
    friday10am: 'Пятница, 10:00',
    today: 'Сегодня',
    schedule: 'Расписание',
    addEvent: 'Добавить событие',
    eventsReminders: 'События и напоминания',
    reminderText: 'Текст напоминания',
    addReminder: 'Добавить напоминание',
    noUpcomingEvents: 'Нет предстоящих событий',

    // Activity Log
    activityLog: 'Журнал действий',
    activityLogDesc: 'История всех действий AI-секретаря',
    allActions: 'Все',
    calendarActions: 'Календарь',
    taskActions: 'Задачи',
    noteActions: 'Заметки',
    chatReplies: 'Ответы',
    noActionsYet: 'Пока нет записей',
    noActionsHint: 'Как только AI-секретарь выполнит действие, оно появится здесь.',
    loadMore: 'Загрузить ещё',
    loadingActivity: 'Загрузка журнала...',
    totalEntries: 'Всего записей',
    refreshActivity: 'Обновить',

    // Accountant
    accountantWelcome: 'Отслеживайте свой бюджет, расходы и финансовые цели.',
    totalBalance: 'Общий баланс',
    income: 'Доход',
    expenses: 'Расходы',
    budget: 'Бюджет',
    reports: 'Отчеты',
    recentTransactions: 'Последние транзакции',
    salaryDeposit: 'Зарплата',
    today: 'Сегодня',
    groceryShopping: 'Покупки продуктов',
    yesterday: 'Вчера',
    utilities: 'Коммунальные услуги',
    twoDaysAgo: '2 дня назад',
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

    // Chat Options
    chatOptions: 'Chat Options',
    share: 'Share',
    rename: 'Rename',
    pin: 'Pin',
    unpin: 'Unpin',
    deleteChatOption: 'Delete',
    renameChat: 'Rename Chat',
    enterNewTitle: 'Enter new title',
    save: 'Save',
    
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

    // Secretary
    secretaryWelcome: 'Manage your schedule, reminders, and tasks efficiently.',
    calendar: 'Calendar',
    reminders: 'Reminders',
    notes: 'Notes',
    upcomingEvents: 'Upcoming Events',
    teamMeeting: 'Team Meeting',
    today2pm: 'Today, 2:00 PM',
    projectDeadline: 'Project Deadline',
    tomorrow5pm: 'Tomorrow, 5:00 PM',
    clientCall: 'Client Call',
    friday10am: 'Friday, 10:00 AM',
    today: 'Today',
    schedule: 'Schedule',
    addEvent: 'Add Event',
    eventsReminders: 'Events & Reminders',
    reminderText: 'Reminder text',
    addReminder: 'Add Reminder',
    noUpcomingEvents: 'No upcoming events',

    // Activity Log
    activityLog: 'Activity Log',
    activityLogDesc: 'History of all AI secretary actions',
    allActions: 'All',
    calendarActions: 'Calendar',
    taskActions: 'Tasks',
    noteActions: 'Notes',
    chatReplies: 'Replies',
    noActionsYet: 'No entries yet',
    noActionsHint: 'AI secretary actions will appear here once performed.',
    loadMore: 'Load More',
    loadingActivity: 'Loading activity log...',
    totalEntries: 'Total entries',
    refreshActivity: 'Refresh',

    // Accountant
    accountantWelcome: 'Track your budget, expenses, and financial goals.',
    totalBalance: 'Total Balance',
    income: 'Income',
    expenses: 'Expenses',
    budget: 'Budget',
    reports: 'Reports',
    recentTransactions: 'Recent Transactions',
    salaryDeposit: 'Salary Deposit',
    today: 'Today',
    groceryShopping: 'Grocery Shopping',
    yesterday: 'Yesterday',
    utilities: 'Utilities',
    twoDaysAgo: '2 days ago',
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
