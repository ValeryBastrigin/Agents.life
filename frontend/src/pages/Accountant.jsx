import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, BookOpen, Calendar, FileText, DollarSign, TrendingUp, Upload, Wallet, CreditCard, Bell, PieChart, ChevronDown, ChevronUp, Trash2, Camera, Lightbulb, AlertTriangle, Star } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import AccountantBackground from '../components/AccountantBackground';
import PortfolioAnalysisModal from '../components/PortfolioAnalysisModal';
import { useNavigate } from 'react-router-dom';

// ---------- Modal: Как пользоваться ----------
const ManualModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <BookOpen size={22} className="text-blue-500" />
            Как пользоваться бухгалтером
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5 text-sm overflow-y-auto flex-1">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-1">Загрузите выписку</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Нажмите на кнопку загрузки ниже и прикрепите вашу банковскую выписку в формате PDF, CSV или Excel. Ixteria автоматически проанализирует все транзакции.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-[2rem] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-1">Анализ по категориям</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Искусственный интеллект распределит все операции по категориям: продукты, транспорт, коммунальные платежи, развлечения и другие. Вы увидите структуру своих расходов.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-1">Планируйте бюджет</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Используйте расчётный календарь для планирования финансовых обязательств. Отмечайте даты платежей, устанавливайте суммы и контролируйте свои финансы.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-1">Следите за обязательствами</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Виджет ближайших финансовых обязательств напомнит о предстоящих платежах, чтобы вы ничего не пропустили.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button onClick={onClose} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-[2rem] transition-colors">
            Понятно!
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Modal: Календарь с обязательствами ----------
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const CalendarModal = ({ isOpen, onClose, obligations, onAddObligation, onDeleteObligation }) => {
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  const [showAddForm, setShowAddForm] = useState(false);
  const [newObligation, setNewObligation] = useState({ date: '', title: '', amount: '', type: 'expense' });

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  };

  const isToday = (day) => day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();

  const getObligationsForDay = (day) => obligations.filter(o => o.date === day);

  const handleDayClick = (day) => {
    setNewObligation(o => ({ ...o, date: String(day) }));
    setShowAddForm(true);
  };

  const handleAddObligation = () => {
    if (!newObligation.date || !newObligation.title || !newObligation.amount) return;
    onAddObligation({
      date: parseInt(newObligation.date),
      title: newObligation.title,
      amount: parseFloat(newObligation.amount),
      type: newObligation.type,
    });
    setNewObligation({ date: '', title: '', amount: '', type: 'expense' });
    setShowAddForm(false);
  };

  const handleDeleteObligation = (index) => {
    const obligation = obligations[index];
    if (obligation && obligation.id) {
      onDeleteObligation(obligation.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Calendar size={22} className="text-blue-500" />
            Расчётный календарь
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 overflow-y-auto flex-1 space-y-4 pb-4">
          {/* Календарь */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ChevronLeft size={18} className="text-gray-500" />
              </button>
              <span className="font-semibold text-gray-800 dark:text-white">
                {MONTHS[calendarMonth]} {calendarYear}
              </span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ChevronRight size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map(w => (
                <div key={w} className="text-center text-xs font-medium text-gray-400 py-1">{w}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth(calendarYear, calendarMonth) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth(calendarYear, calendarMonth) }).map((_, i) => {
                const day = i + 1;
                const dayObligations = getObligationsForDay(day);
                const hasIncome = dayObligations.some(o => o.type === 'income');
                const hasExpense = dayObligations.some(o => o.type === 'expense');
                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square rounded-full text-sm font-medium flex flex-col items-center justify-center relative cursor-pointer ${
                      isToday(day) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{day}</span>
                    <div className="flex gap-0.5 absolute bottom-1">
                      {hasIncome && <span className="w-1 h-1 rounded-full bg-green-500" />}
                      {hasExpense && <span className="w-1 h-1 rounded-full bg-red-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Список обязательств на выбранную дату */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <DollarSign size={16} className="text-blue-500" />
                Финансовые обязательства
              </h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-[2rem] transition-colors"
              >
                + Добавить
              </button>
            </div>

            {showAddForm && (
              <div className="mb-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Дата</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="15"
                      value={newObligation.date}
                      onChange={e => setNewObligation(o => ({ ...o, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Сумма</label>
                    <input
                      type="number"
                      placeholder="10000"
                      value={newObligation.amount}
                      onChange={e => setNewObligation(o => ({ ...o, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Название</label>
                  <input
                    type="text"
                    placeholder="Аренда квартиры"
                    value={newObligation.title}
                    onChange={e => setNewObligation(o => ({ ...o, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Тип</label>
                  <div className="flex gap-2">
                    {[
                      { key: 'income', label: '💰 Доход' },
                      { key: 'expense', label: '💸 Расход' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setNewObligation(o => ({ ...o, type: key }))}
                        className={`flex-1 py-2 rounded-[1.5rem] text-sm font-medium transition-colors ${
                          newObligation.type === key
                            ? key === 'income'
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddObligation}
                    disabled={!newObligation.date || !newObligation.title || !newObligation.amount}
                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-[2rem] transition-colors disabled:cursor-not-allowed"
                  >
                    Добавить
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {obligations.length === 0 ? (
              <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нет финансовых обязательств</p>
                <p className="text-xs mt-1">Добавьте регулярные платежи, чтобы видеть их в календаре</p>
              </div>
            ) : (
              <div className="space-y-2">
                {obligations.sort((a, b) => a.date - b.date).map((obligation, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-[1.5rem] group"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      obligation.type === 'income'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {obligation.type === 'income' ? (
                        <TrendingUp size={16} className="text-green-500" />
                      ) : (
                        <CreditCard size={16} className="text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{obligation.title}</p>
                      <p className="text-xs text-gray-400">Каждое {obligation.date}-е число месяца</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${
                        obligation.type === 'income' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {obligation.type === 'income' ? '+' : '-'}{obligation.amount.toLocaleString()} ₽
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteObligation(idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"
                    >
                      <X size={14} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            onClick={() => { setShowAddForm(false); onClose(); }}
            className="w-full py-3 bg-gray-800 dark:bg-white dark:text-gray-900 text-white font-medium rounded-[2rem] transition-colors hover:bg-gray-700 dark:hover:bg-gray-100"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Компонент: просмотр деталей выписки с категориями и транзакциями ----------
const StatementDetailView = ({ statement, onBack }) => {
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  // Парсим categories_data
  let categories = {};
  try {
    categories = JSON.parse(statement.categories_data || '{}');
  } catch (e) {
    categories = {};
  }

  // Группируем транзакции по категориям
  const transactionsByCategory = {};
  (statement.transactions || []).forEach(tx => {
    const cat = tx.category || 'other';
    if (!transactionsByCategory[cat]) transactionsByCategory[cat] = [];
    transactionsByCategory[cat].push(tx);
  });

  // Собираем все категории
  const allCategoryNames = [...new Set([
    ...Object.keys(categories),
    ...Object.keys(transactionsByCategory)
  ])];

  // Сортируем: сначала расходы (по убыванию суммы), потом доходы
  const sortedCategories = allCategoryNames.sort((a, b) => {
    const catA = categories[a] || {};
    const catB = categories[b] || {};
    const totalA = Math.abs(catA.expense || 0);
    const totalB = Math.abs(catB.expense || 0);
    if (totalA !== totalB) return totalB - totalA;
    return a.localeCompare(b);
  });

  // Иконки для категорий
  const categoryIcon = (name) => {
    const icons = {
      'продукты': '🛒',
      'продукты питания': '🛒',
      'супермаркет': '🛒',
      'транспорт': '🚗',
      'такси': '🚕',
      'бензин': '⛽',
      'коммунальные платежи': '🏠',
      'коммуналка': '🏠',
      'жильё': '🏠',
      'квартплата': '🏠',
      'связь': '📱',
      'интернет': '🌐',
      'телефон': '📞',
      'развлечения': '🎬',
      'досуг': '🎮',
      'кафе': '☕',
      'рестораны': '🍽',
      'здоровье': '💊',
      'аптека': '💊',
      'медицина': '🏥',
      'образование': '📚',
      'обучение': '📖',
      'одежда': '👕',
      'покупки': '🛍',
      'магазин': '🛍',
      'зп': '💰',
      'зарплата': '💰',
      'доход': '💵',
      'перевод': '💸',
      'прочее': '📋',
      'other': '📋',
      'другое': '📋',
    };
    return icons[name.toLowerCase()] || '📋';
  };

  return (
    <div className="space-y-4">
      {/* Кнопка назад */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors"
      >
        <ChevronLeft size={16} />
        Назад к списку
      </button>

      {/* Шапка выписки */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Wallet size={18} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
            {statement.bank_name || 'Банковская выписка'}
          </p>
          <p className="text-xs text-gray-400">
            {statement.period_start && statement.period_end
              ? `${statement.period_start} — ${statement.period_end}`
              : statement.filename}
          </p>
        </div>
      </div>

      {/* Итого */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-[1.5rem] p-3 text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">Поступления</p>
          <p className="text-sm font-bold text-green-500">
            +{statement.total_income.toLocaleString()} ₽
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-[1.5rem] p-3 text-center">
          <p className="text-[10px] text-gray-400 mb-0.5">Траты</p>
          <p className="text-sm font-bold text-red-500">
            -{statement.total_expense.toLocaleString()} ₽
          </p>
        </div>
      </div>

      {/* Категории с транзакциями */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Категории</h3>
        {sortedCategories.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Нет данных по категориям</p>
        ) : (
          sortedCategories.map(catName => {
            const catData = categories[catName] || {};
            const txList = transactionsByCategory[catName] || [];
            const isExpanded = expandedCategories[catName];
            const totalIncome = catData.income || 0;
            const totalExpense = Math.abs(catData.expense || 0);

            return (
              <div
                key={catName}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-[1.5rem] overflow-hidden transition-all"
              >
                {/* Заголовок категории — кликабельный */}
                <button
                  onClick={() => toggleCategory(catName)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  <span className="text-lg flex-shrink-0">{categoryIcon(catName)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white capitalize">
                      {catName === 'other' ? 'Прочее' : catName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {txList.length} {txList.length === 1 ? 'операция' : 'операций'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {totalExpense > 0 && (
                      <p className="text-sm font-bold text-red-500">-{totalExpense.toLocaleString()} ₽</p>
                    )}
                    {totalIncome > 0 && (
                      <p className="text-sm font-bold text-green-500">+{totalIncome.toLocaleString()} ₽</p>
                    )}
                  </div>
                  {txList.length > 0 && (
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  )}
                </button>

                {/* Раскрывающийся список транзакций */}
                {isExpanded && txList.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700/50">
                    {txList.map((tx, idx) => (
                      <div
                        key={tx.id || idx}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'income'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {tx.type === 'income' ? (
                            <TrendingUp size={12} className="text-green-500" />
                          ) : (
                            <CreditCard size={12} className="text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 dark:text-white truncate">
                            {tx.description || 'Транзакция'}
                          </p>
                          {tx.date && (
                            <p className="text-[10px] text-gray-400">{tx.date}</p>
                          )}
                        </div>
                        <p className={`text-xs font-bold flex-shrink-0 ${
                          tx.type === 'income' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {tx.type === 'income' ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()} ₽
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Анализ от LLM */}
      {statement.analysis_text && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[1.5rem] p-4 mt-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Анализ</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
            {statement.analysis_text}
          </p>
        </div>
      )}
    </div>
  );
};

// ---------- Modal: История выписок ----------
const StatementsModal = ({ isOpen, onClose, onStatementsChange }) => {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Загрузка списка выписок
  useEffect(() => {
    if (!isOpen) return;
    const loadStatements = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/api/accountant/statements/1');
        setStatements(res.data || []);
      } catch (err) {
        console.error('Ошибка загрузки выписок:', err);
        setStatements([]);
      } finally {
        setLoading(false);
      }
    };
    loadStatements();
  }, [isOpen, onStatementsChange]);

  // Загрузка деталей выписки при клике
  const handleStatementClick = async (stmtId) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/api/accountant/statements/detail/${stmtId}`);
      setSelectedStatement(res.data);
    } catch (err) {
      console.error('Ошибка загрузки деталей выписки:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedStatement(null);
  };

  // Удаление выписки
  const handleDeleteStatement = async (stmtId, e) => {
    e.stopPropagation();
    if (confirmDeleteId === stmtId) {
      setDeletingId(stmtId);
      try {
        await apiClient.delete(`/api/accountant/statements/${stmtId}`);
        setStatements(prev => prev.filter(s => s.id !== stmtId));
        setConfirmDeleteId(null);
        if (onStatementsChange) onStatementsChange();
      } catch (err) {
        console.error('Ошибка удаления выписки:', err);
      } finally {
        setDeletingId(null);
      }
    } else {
      setConfirmDeleteId(stmtId);
    }
  };

  // Сброс подтверждения удаления при клике вне
  useEffect(() => {
    if (confirmDeleteId) {
      const timer = setTimeout(() => setConfirmDeleteId(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FileText size={22} className="text-blue-500" />
            {selectedStatement ? 'Детали выписки' : 'История выписок'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 overflow-y-auto flex-1 pb-4">
          {selectedStatement ? (
            detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <StatementDetailView statement={selectedStatement} onBack={handleBack} />
            )
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : statements.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500">
              <FileText size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Нет загруженных выписок</p>
              <p className="text-xs mt-1">Загрузите банковскую выписку, чтобы увидеть анализ</p>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              {statements.map((stmt) => (
                <div
                  key={stmt.id}
                  onClick={() => handleStatementClick(stmt.id)}
                  className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border border-gray-100 dark:border-transparent relative group"
                >
                  {/* Кнопка удаления — всегда видна на мобильных */}
                  <button
                    onClick={(e) => handleDeleteStatement(stmt.id, e)}
                    disabled={deletingId === stmt.id}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 ${
                      confirmDeleteId === stmt.id
                        ? 'bg-red-500 text-white scale-110 shadow-md'
                        : 'bg-red-100/80 dark:bg-red-900/40 text-red-500 hover:bg-red-200 dark:hover:bg-red-800/50 lg:opacity-0 lg:group-hover:opacity-100'
                    }`}
                    title={confirmDeleteId === stmt.id ? 'Нажмите ещё раз для удаления' : 'Удалить выписку'}
                  >
                    {deletingId === stmt.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : confirmDeleteId === stmt.id ? (
                      <X size={14} />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>

                  <div className="flex items-center gap-3 mb-3 pr-9">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Wallet size={16} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{stmt.bank_name || 'Банковская выписка'}</p>
                      <p className="text-xs text-gray-400 truncate">{stmt.filename}</p>
                    </div>
                    {stmt.period_start && stmt.period_end && (
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-full flex-shrink-0 hidden sm:inline">
                        {stmt.period_start} — {stmt.period_end}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-center py-2.5 px-2 bg-white dark:bg-gray-900 rounded-[1.25rem]">
                      <p className="text-[10px] text-gray-400 mb-0.5">Поступления</p>
                      <p className="text-sm font-bold text-green-500">+{stmt.total_income.toLocaleString()} ₽</p>
                    </div>
                    <div className="flex-1 text-center py-2.5 px-2 bg-white dark:bg-gray-900 rounded-[1.25rem]">
                      <p className="text-[10px] text-gray-400 mb-0.5">Траты</p>
                      <p className="text-sm font-bold text-red-500">-{stmt.total_expense.toLocaleString()} ₽</p>
                    </div>
                    <div className="flex-1 text-center py-2.5 px-2 bg-white dark:bg-gray-900 rounded-[1.25rem]">
                      <p className="text-[10px] text-gray-400 mb-0.5">Категории</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{stmt.categories_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2">
          <button onClick={onClose} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-[2rem] transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== Главная страница Финансового-помощника ==========
const Accountant = () => {
  const navigate = useNavigate();
  const [showManual, setShowManual] = useState(false);
  const [showStatements, setShowStatements] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [obligations, setObligations] = useState([]);
  const [latestStatement, setLatestStatement] = useState(null);
  const [statementsRefresh, setStatementsRefresh] = useState(0);

  // Активная вкладка: 'main' или 'investments'
  const [activeTab, setActiveTab] = useState('main');

  // Состояние для модалки анализа портфеля
  const [showPortfolioAnalysis, setShowPortfolioAnalysis] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);

  // Загрузка последнего анализа портфеля
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const res = await apiClient.get('/api/accountant/portfolio/analyses/latest/1');
        if (res.data) {
          setPortfolioData(res.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки анализа портфеля:', err);
      }
    };
    loadPortfolio();
  }, []);

  const handlePortfolioAnalysisComplete = (data) => {
    setPortfolioData(data);
    setShowPortfolioAnalysis(false);
  };

  // Функция для парсинга JSON-полей (strengths, weaknesses, recommendations, asset_allocation)
  const parseJsonField = (field) => {
    if (!field) return null;
    try {
      return JSON.parse(field);
    } catch {
      return null;
    }
  };

  // Загрузка обязательств из БД
  useEffect(() => {
    const loadObligations = async () => {
      try {
        const res = await apiClient.get('/api/accountant/obligations/1');
        setObligations(res.data);
      } catch (err) {
        console.error('Ошибка загрузки обязательств:', err);
      }
    };
    loadObligations();
  }, []);

  // Добавление обязательства
  const addObligation = useCallback(async (obligation) => {
    try {
      const res = await apiClient.post('/api/accountant/obligations/1', obligation);
      setObligations(prev => [...prev, res.data]);
    } catch (err) {
      console.error('Ошибка добавления обязательства:', err);
    }
  }, []);

  // Удаление обязательства
  const deleteObligation = useCallback(async (id) => {
    try {
      await apiClient.delete(`/api/accountant/obligations/${id}`);
      setObligations(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error('Ошибка удаления обязательства:', err);
    }
  }, []);

  // Загрузка последней выписки
  useEffect(() => {
    const loadLatest = async () => {
      try {
        const res = await apiClient.get('/api/accountant/statements/1');
        const data = res.data;
        if (data && data.length > 0) {
          // Получаем детали последней выписки
          try {
            const detailRes = await apiClient.get(`/api/accountant/statements/detail/${data[0].id}`);
            setLatestStatement(detailRes.data);
          } catch {
            setLatestStatement(data[0]);
          }
        } else {
          setLatestStatement(null);
        }
      } catch (err) {
        console.error('Ошибка загрузки выписок:', err);
        setLatestStatement(null);
      }
    };
    loadLatest();
  }, [statementsRefresh]);

  // Вычисляем ближайшие обязательства на сегодня и ближайшие дни
  const today = new Date();
  const currentDay = today.getDate();
  const upcomingObligations = obligations
    .map(o => ({
      ...o,
      daysLeft: o.date >= currentDay ? o.date - currentDay : (o.date + 30 - currentDay),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  // Для модалки просмотра деталей последней выписки
  const [showLatestDetail, setShowLatestDetail] = useState(false);

  return (
    <div className="flex-1 relative overflow-y-auto px-6 pt-0 pb-8">
      {/* Purple animated background — fixed, покрывает весь экран (включая хедер) */}
      <AccountantBackground />
      <div className="relative z-10 max-w-2xl mx-auto pt-4">
        {/* ════════ КНОПКА АНАЛИЗА ФИНАНСОВ — КАК У СЕКРЕТАРЯ ════════ */}
        <button
          onClick={() => navigate('/financial-analyst')}
          className="group w-full bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 rounded-[3rem] py-3.5 px-4 md:p-5 text-white text-left mb-6 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all duration-300"
        >
          <div className="flex items-center gap-3 md:gap-4 w-full">
            <img 
              src="/assets/icons/agents/бухгалтер.svg" 
              alt="" 
              className="w-12 h-12 md:w-20 md:h-20 shrink-0 animate-bounce-soft group-hover:scale-110 transition-all duration-300 drop-shadow-lg" 
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm md:text-lg font-semibold leading-tight md:leading-normal mb-0.5">Проанализировать финансы</h3>
              <p className="text-[10px] md:text-xs text-white/80 leading-tight md:leading-relaxed">
                Загрузите выписку, инвестиционный портфель или поставьте финансовую цель — Ixteria разберёт всё до копейки
              </p>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0 group-hover:bg-white/20">
              <svg className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* ===== 3 блока-виджета (как в диетологе) ===== */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Блок 1: Как пользоваться */}
          <button
            onClick={() => setShowManual(true)}
            className="bg-white dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent"
          >
            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                Как пользоваться
              </span>
            </div>
          </button>

          {/* Блок 2: История выписок */}
          <button
            onClick={() => setShowStatements(true)}
            className="bg-white dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent"
          >
            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                История выписок
              </span>
            </div>
          </button>

          {/* Блок 3: Расчётный календарь */}
          <button
            onClick={() => setShowCalendar(true)}
            className="bg-white dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent"
          >
            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Calendar size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                Расчётный календарь
              </span>
            </div>
          </button>
        </div>

        {/* ===== Тумблер переключения Основное / Инвестиции ===== */}
        <div className="bg-white dark:bg-surface-dark rounded-[3rem] p-1.5 mb-6 shadow-sm border border-gray-100 dark:border-gray-700/30 flex">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[2.5rem] text-sm font-semibold transition-all ${
              activeTab === 'main'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Wallet size={16} className={activeTab === 'main' ? 'text-white' : ''} />
            1 • Основное
          </button>
          <button
            onClick={() => setActiveTab('investments')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[2.5rem] text-sm font-semibold transition-all ${
              activeTab === 'investments'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <TrendingUp size={16} className={activeTab === 'investments' ? 'text-white' : ''} />
            2 • Инвестиции
          </button>
        </div>

        {/* ===== Контент вкладки "Основное" ===== */}
        {activeTab === 'main' && (
          <>
            {/* Ближайшие финансовые обязательства */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <Bell size={18} className="text-blue-500" />
                  Ближайшие обязательства
                </h2>
              </div>

              <div className="space-y-2">
                {upcomingObligations.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                    <Bell size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Нет предстоящих обязательств</p>
                    <p className="text-xs mt-1">Добавьте их в расчётном календаре</p>
                  </div>
                ) : (
                  upcomingObligations.map((obligation, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-[2rem] group"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        obligation.type === 'income'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {obligation.type === 'income' ? (
                          <TrendingUp size={16} className="text-green-500" />
                        ) : (
                          <CreditCard size={16} className="text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{obligation.title}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            obligation.daysLeft <= 7
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : obligation.daysLeft <= 14
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            {obligation.daysLeft === 0 ? 'Сегодня' : `Через ${obligation.daysLeft} дн.`}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{obligation.date}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${
                          obligation.type === 'income' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {obligation.type === 'income' ? '+' : '-'}{obligation.amount.toLocaleString()} ₽
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Последняя загруженная выписка */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-5 mb-6 shadow-sm border border-gray-100 dark:border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <FileText size={18} className="text-purple-500" />
                  {latestStatement ? 'Последняя выписка' : 'Банковская выписка'}
                </h2>
                <button
                  onClick={() => navigate('/financial-analyst')}
                  className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors"
                >
                  <Upload size={16} className="text-purple-600 dark:text-purple-400" />
                </button>
              </div>

              {latestStatement ? (
                <div
                  onClick={() => setShowLatestDetail(true)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Wallet size={18} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                        {latestStatement.bank_name || 'Банковская выписка'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {latestStatement.period_start && latestStatement.period_end
                          ? `${latestStatement.period_start} — ${latestStatement.period_end}`
                          : latestStatement.filename}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-[1.5rem] p-3 text-center">
                      <p className="text-[10px] text-gray-400 mb-0.5">Поступления</p>
                      <p className="text-sm font-bold text-green-500">
                        +{latestStatement.total_income.toLocaleString()} ₽
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-[1.5rem] p-3 text-center">
                      <p className="text-[10px] text-gray-400 mb-0.5">Траты</p>
                      <p className="text-sm font-bold text-red-500">
                        -{latestStatement.total_expense.toLocaleString()} ₽
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <FileText size={20} className="text-purple-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Выписок пока нет</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Нажмите + чтобы загрузить</p>
                </div>
              )}
            </div>

            {/* Модалка с деталями последней выписки */}
            {showLatestDetail && latestStatement && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <FileText size={22} className="text-blue-500" />
                      Детали выписки
                    </h2>
                    <button onClick={() => setShowLatestDetail(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                      <X size={20} className="text-gray-500" />
                    </button>
                  </div>

                  <div className="px-6 overflow-y-auto flex-1 pb-4">
                    <StatementDetailView
                      statement={latestStatement}
                      onBack={() => setShowLatestDetail(false)}
                    />
                  </div>

                  <div className="px-6 pb-6 pt-2">
                    <button
                      onClick={() => setShowLatestDetail(false)}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-[2rem] transition-colors"
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== Контент вкладки "Инвестиции" ===== */}
        {activeTab === 'investments' && (
          <div className="space-y-4">
            {/* Кнопка "Сделайте анализ инвестиционного портфеля" */}
            <button
              onClick={() => setShowPortfolioAnalysis(true)}
              className="group w-full bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 rounded-[3rem] py-3.5 px-4 md:p-5 text-white text-left shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all duration-300"
            >
              <div className="flex items-center gap-3 md:gap-4 w-full">
                <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-bounce-soft group-hover:scale-110 transition-all duration-300">
                  <Camera size={28} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm md:text-lg font-semibold leading-tight md:leading-normal mb-0.5">Сделайте анализ инвестиционного портфеля</h3>
                  <p className="text-[10px] md:text-xs text-white/80 leading-tight md:leading-relaxed">
                    Загрузите скриншоты своего портфеля — Ixteria найдёт слабые стороны и предложит план ребалансировки
                  </p>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0 group-hover:bg-white/20">
                  <ChevronRight size={18} className="text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* Виджет: Анализ вашего инвестиционного портфеля */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-5 shadow-sm border border-gray-100 dark:border-gray-700/30">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <PieChart size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                  Анализ вашего инвестиционного портфеля
                </h2>
              </div>

              {!portfolioData ? (
                <>
                  {/* Пустое состояние */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Оценка портфеля</h3>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-6 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <PieChart size={18} className="text-purple-500" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Анализ ещё не выполнен
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Сделайте анализ портфеля, нажав на кнопку выше
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Оценка портфеля */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Общая оценка</h3>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-4 flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                        portfolioData.overall_score >= 7
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : portfolioData.overall_score >= 4
                            ? 'bg-amber-100 dark:bg-amber-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <span className={`text-2xl font-bold ${
                          portfolioData.overall_score >= 7
                            ? 'text-green-600 dark:text-green-400'
                            : portfolioData.overall_score >= 4
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}>
                          {portfolioData.overall_score}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          {[1,2,3,4,5,6,7,8,9,10].map(i => (
                            <Star
                              key={i}
                              size={12}
                              className={i <= portfolioData.overall_score ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {portfolioData.overall_score >= 8 ? 'Отличная диверсификация и низкий риск' :
                           portfolioData.overall_score >= 6 ? 'Хороший портфель, есть зоны для улучшения' :
                           portfolioData.overall_score >= 4 ? 'Средний уровень, требуется ребалансировка' :
                           'Требуется серьёзная ребалансировка портфеля'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Распределение активов */}
                  {(() => {
                    const allocation = parseJsonField(portfolioData.asset_allocation);
                    if (!allocation) return null;
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];
                    const entries = Object.entries(allocation).filter(([, v]) => v > 0);
                    return (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Распределение активов</h3>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-4">
                          {/* Полоска распределения */}
                          <div className="flex h-3 rounded-full overflow-hidden mb-3">
                            {entries.map(([name, percent], idx) => (
                              <div
                                key={name}
                                style={{ width: `${percent}%` }}
                                className={`${colors[idx % colors.length]} transition-all duration-500`}
                                title={`${name}: ${percent}%`}
                              />
                            ))}
                          </div>
                          {/* Легенда */}
                          <div className="grid grid-cols-2 gap-2">
                            {entries.map(([name, percent], idx) => (
                              <div key={name} className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]} flex-shrink-0`} />
                                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{name}</span>
                                <span className="text-xs font-semibold text-gray-800 dark:text-white ml-auto">{percent}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Сильные стороны */}
                  {(() => {
                    const strengths = parseJsonField(portfolioData.strengths);
                    if (!strengths || strengths.length === 0) return null;
                    return (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb size={14} className="text-green-500" />
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Сильные стороны</h3>
                        </div>
                        <div className="space-y-1.5">
                          {strengths.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 rounded-[1.25rem] px-3 py-2">
                              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                              <span className="text-xs text-gray-700 dark:text-gray-300">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Слабые стороны */}
                  {(() => {
                    const weaknesses = parseJsonField(portfolioData.weaknesses);
                    if (!weaknesses || weaknesses.length === 0) return null;
                    return (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={14} className="text-red-500" />
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Слабые стороны</h3>
                        </div>
                        <div className="space-y-1.5">
                          {weaknesses.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 rounded-[1.25rem] px-3 py-2">
                              <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                              <span className="text-xs text-gray-700 dark:text-gray-300">{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Рекомендации */}
                  {(() => {
                    const recommendations = parseJsonField(portfolioData.recommendations);
                    if (!recommendations || recommendations.length === 0) return null;
                    return (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Star size={14} className="text-amber-500" />
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Рекомендации по ребалансировке</h3>
                        </div>
                        <div className="space-y-1.5">
                          {recommendations.map((r, i) => (
                            <div key={i} className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-[1.25rem] px-3 py-2">
                              <span className="text-amber-500 mt-0.5 flex-shrink-0 font-bold text-xs">{i + 1}.</span>
                              <span className="text-xs text-gray-700 dark:text-gray-300">{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Модалки */}
      <ManualModal isOpen={showManual} onClose={() => setShowManual(false)} />
      <StatementsModal
        isOpen={showStatements}
        onClose={() => setShowStatements(false)}
        onStatementsChange={() => setStatementsRefresh(prev => prev + 1)}
      />
      <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} obligations={obligations} onAddObligation={addObligation} onDeleteObligation={deleteObligation} />
      <PortfolioAnalysisModal
        isOpen={showPortfolioAnalysis}
        onClose={() => setShowPortfolioAnalysis(false)}
        onComplete={handlePortfolioAnalysisComplete}
        userId={1}
      />
    </div>
  );
};

export default Accountant;