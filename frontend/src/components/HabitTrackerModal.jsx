import React, { useState } from 'react';
import { Plus, X, Sparkles, Flame, Heart, Brain, Dumbbell, Book, Coffee, Moon, Tv, Cigarette, AlertTriangle, Zap, ChevronRight } from 'lucide-react';

const GOOD_HABITS = [
  { id: 'exercise', name: 'Зарядка / Спорт', icon: '🏋️', desc: 'Физическая активность', color: 'from-green-400 to-emerald-500' },
  { id: 'reading', name: 'Чтение', icon: '📚', desc: 'Чтение книг 20+ минут', color: 'from-blue-400 to-indigo-500' },
  { id: 'meditation', name: 'Медитация', icon: '🧘', desc: 'Осознанность и покой', color: 'from-violet-400 to-purple-500' },
  { id: 'water', name: 'Вода 2л', icon: '💧', desc: 'Питьевой режим', color: 'from-cyan-400 to-blue-500' },
  { id: 'healthy_meal', name: 'Полезный приём пищи', icon: '🥗', desc: 'Здоровое питание', color: 'from-lime-400 to-green-500' },
  { id: 'walk', name: 'Прогулка', icon: '🚶', desc: 'Прогулка на свежем воздухе', color: 'from-teal-400 to-cyan-500' },
  { id: 'journal', name: 'Дневник', icon: '📝', desc: 'Запись мыслей и рефлексия', color: 'from-amber-400 to-orange-500' },
  { id: 'sleep', name: 'Ранний отход ко сну', icon: '🌙', desc: 'Сон до 23:00', color: 'from-indigo-400 to-violet-500' },
  { id: 'learning', name: 'Обучение', icon: '🎓', desc: 'Новый навык или курс', color: 'from-sky-400 to-blue-500' },
  { id: 'gratitude', name: 'Благодарность', icon: '🙏', desc: 'Записать 3 благодарности', color: 'from-pink-400 to-rose-500' },
  { id: 'stretching', name: 'Растяжка', icon: '🤸', desc: '5-10 минут растяжки', color: 'from-fuchsia-400 to-pink-500' },
  { id: 'social', name: 'Общение с близкими', icon: '💬', desc: 'Позвонить/встретиться', color: 'from-rose-400 to-red-500' },
];

const BAD_HABITS = [
  { id: 'smoking', name: 'Курение', icon: '🚬', desc: 'Борьба с курением', color: 'from-red-400 to-rose-500' },
  { id: 'alcohol', name: 'Алкоголь', icon: '🍷', desc: 'Отказ от алкоголя', color: 'from-orange-400 to-red-500' },
  { id: 'junk_food', name: 'Фастфуд / Сладкое', icon: '🍔', desc: 'Вредная еда', color: 'from-yellow-400 to-orange-500' },
  { id: 'procrastination', name: 'Прокрастинация', icon: '📱', desc: 'Зависание в соцсетях', color: 'from-gray-400 to-gray-500' },
  { id: 'late_sleep', name: 'Поздний отход ко сну', icon: '🌃', desc: 'Сон после 00:00', color: 'from-blue-400 to-indigo-500' },
  { id: 'sugar', name: 'Сахар / Сладкие напитки', icon: '🥤', desc: 'Отказ от сахара', color: 'from-pink-400 to-rose-500' },
  { id: 'gaming', name: 'Игры (чрезмерно)', icon: '🎮', desc: 'Ограничение игр', color: 'from-violet-400 to-purple-500' },
  { id: 'snacking', name: 'Перекусы на ночь', icon: '🌜', desc: 'Еда после 20:00', color: 'from-indigo-400 to-blue-500' },
  { id: 'nail_biting', name: 'Грызть ногти', icon: '🖐️', desc: 'Вредная привычка', color: 'from-amber-400 to-yellow-500' },
  { id: 'caffeine', name: 'Кофеин (избыток)', icon: '☕', desc: 'Больше 2 чашек кофе', color: 'from-brown-400 to-amber-500' },
];

const HabitTrackerModal = ({ isOpen, onClose, onAddHabit }) => {
  const [tab, setTab] = useState('good');
  const [search, setSearch] = useState('');
  const [selectedHabits, setSelectedHabits] = useState({});
  const [customHabit, setCustomHabit] = useState({ name: '', icon: '⭐', desc: '', type: 'good' });

  const habits = tab === 'good' ? GOOD_HABITS : BAD_HABITS;

  const filteredHabits = habits.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.desc.toLowerCase().includes(search.toLowerCase())
  );

  const toggleHabit = (habitId) => {
    setSelectedHabits(prev => ({
      ...prev,
      [habitId]: !prev[habitId]
    }));
  };

  const handleAdd = () => {
    const selected = tab === 'good' ? GOOD_HABITS : BAD_HABITS;
    const toAdd = selected.filter(h => selectedHabits[h.id]);
    toAdd.forEach(h => {
      onAddHabit({
        ...h,
        type: tab === 'good' ? 'good' : 'bad',
        streak: 0,
        completedToday: false,
        createdAt: new Date().toISOString(),
        history: [],
        xp: 0,
      });
    });

    // Add custom habit if filled
    if (customHabit.name.trim()) {
      onAddHabit({
        id: `custom_${Date.now()}`,
        name: customHabit.name.trim(),
        icon: customHabit.icon,
        desc: customHabit.desc,
        type: tab,
        color: tab === 'good' ? 'from-green-400 to-emerald-500' : 'from-red-400 to-rose-500',
        streak: 0,
        completedToday: false,
        createdAt: new Date().toISOString(),
        history: [],
        xp: 0,
      });
      setCustomHabit({ name: '', icon: '⭐', desc: '', type: 'good' });
    }

    if (toAdd.length > 0 || customHabit.name.trim()) {
      onClose();
      setSelectedHabits({});
      setSearch('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-background-light dark:bg-background-dark rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Sparkles size={22} className="text-amber-500" />
              Добавить привычки
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab('good')}
              className={`flex-1 py-2.5 rounded-2xl font-medium text-sm transition-all ${
                tab === 'good'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                  : 'bg-surface-light dark:bg-surface-dark text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Heart size={16} className="inline mr-1.5" />
              Полезные
            </button>
            <button
              onClick={() => setTab('bad')}
              className={`flex-1 py-2.5 rounded-2xl font-medium text-sm transition-all ${
                tab === 'bad'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25'
                  : 'bg-surface-light dark:bg-surface-dark text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <AlertTriangle size={16} className="inline mr-1.5" />
              Вредные
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск привычек..."
            className="w-full p-3 rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 mb-2 text-sm"
          />
        </div>

        {/* Habits List */}
        <div className="px-6 overflow-y-auto max-h-72 space-y-1.5 pb-2">
          {filteredHabits.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">Ничего не найдено</p>
            </div>
          ) : (
            filteredHabits.map((habit) => (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${
                  selectedHabits[habit.id]
                    ? tab === 'good'
                      ? 'bg-green-50 dark:bg-green-900/20 ring-2 ring-green-400 dark:ring-green-500'
                      : 'bg-red-50 dark:bg-red-900/20 ring-2 ring-red-400 dark:ring-red-500'
                    : 'bg-surface-light dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${habit.color} flex items-center justify-center text-lg shrink-0 shadow-sm`}>
                  {habit.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800 dark:text-white">{habit.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{habit.desc}</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                  selectedHabits[habit.id]
                    ? tab === 'good'
                      ? 'bg-green-500 border-green-500'
                      : 'bg-red-500 border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedHabits[habit.id] && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Custom habit */}
        <div className="px-6 pt-2 pb-4">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Или создайте свою привычку:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customHabit.name}
                onChange={(e) => setCustomHabit(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Название привычки"
                className="flex-1 p-2.5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleAdd}
            disabled={Object.values(selectedHabits).filter(Boolean).length === 0 && !customHabit.name.trim()}
            className={`w-full py-3 rounded-[2rem] font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              Object.values(selectedHabits).filter(Boolean).length > 0 || customHabit.name.trim()
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus size={18} />
            Добавить {Object.values(selectedHabits).filter(Boolean).length + (customHabit.name.trim() ? 1 : 0)} привычек
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitTrackerModal;