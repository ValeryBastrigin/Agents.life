import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Plus, Trash2, Edit3, X, Send, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const apiBase = process.env.REACT_APP_API_URL || '';

function getUserId() {
  try {
    return parseInt(localStorage.getItem('selectedUserId') || '1', 10);
  } catch {
    return 1;
  }
}

const MOOD_OPTIONS = [
  { value: 4, emoji: '😊', label: 'Отлично' },
  { value: 3, emoji: '🙂', label: 'Хорошо' },
  { value: 2, emoji: '😐', label: 'Нормально' },
  { value: 1, emoji: '😔', label: 'Плохо' },
  { value: 0, emoji: '😢', label: 'Очень плохо' },
];

// Helper to format date nicely
function formatDate(iso) {
  const d = new Date(iso);
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return `Сегодня, ${hours}:${minutes}`;
  if (d.toDateString() === yesterday.toDateString()) return `Вчера, ${hours}:${minutes}`;
  return `${day} ${month}, ${hours}:${minutes}`;
}

export default function PsychologistDiary() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null);

  const userId = getUserId();

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/user/${userId}/diary`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setEntries(data);
    } catch (e) {
      console.error('Load diary error:', e);
      setError('Не удалось загрузить записи');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedMood(null);
    setTagsInput('');
    setShowForm(false);
    setError('');
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Напишите хотя бы пару мыслей');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const tags = tagsInput
        .split(/[,;\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const payload = {
        title: title.trim(),
        content: content.trim(),
        mood: selectedMood?.value ?? null,
        mood_emoji: selectedMood?.emoji ?? null,
        tags,
      };

      const res = await fetch(`${apiBase}/api/user/${userId}/diary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Save failed');

      resetForm();
      await loadEntries();
    } catch (e) {
      console.error('Save diary error:', e);
      setError('Не удалось сохранить запись');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${apiBase}/api/diary/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setDeleteId(null);
      await loadEntries();
    } catch (e) {
      console.error('Delete diary error:', e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8">
      <div className="max-w-2xl mx-auto">
        {/* Hero header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-400 to-pink-500 dark:from-amber-600 dark:via-orange-500 dark:to-pink-600 rounded-[3.5rem] p-6 sm:p-8 mb-8 shadow-lg shadow-amber-500/20">
          <div className="relative z-10">
            <button
              onClick={() => navigate('/psychologist')}
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Назад к психологу</span>
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <BookOpen size={26} className="text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Дневник</h1>
            </div>
            <p className="text-white/80 text-sm">
              Записывайте свои мысли, чувства и переживания. Это помогает лучше понять себя.
            </p>
          </div>
        </div>

        {/* New entry button or form */}
        <div className="mb-6 min-h-[60px]">
          <AnimatePresence mode="wait">
            {!showForm ? (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => setShowForm(true)}
                className="w-full py-4 px-6 rounded-[2rem] border-2 border-dashed border-amber-300 dark:border-amber-600 text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus size={18} />
                Новая запись в дневнике
              </motion.button>
            ) : (
              <motion.div
                key="add-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="bg-white dark:bg-surface-dark rounded-[3rem] p-5 shadow-sm border border-gray-100 dark:border-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white">Новая запись</h3>
                  <button
                    onClick={resetForm}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <input
                    type="text"
                    placeholder="Заголовок (необязательно)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  />

                  {/* Content */}
                  <textarea
                    placeholder="Что у вас на душе? Поделитесь своими мыслями..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm resize-none"
                  />

                  {/* Mood selector */}
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                      Ваше настроение (необязательно)
                    </label>
                    <div className="flex gap-2">
                      {MOOD_OPTIONS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setSelectedMood(m)}
                          className={`flex-1 py-2 rounded-xl text-center text-lg transition-all ${
                            selectedMood?.value === m.value
                              ? 'bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-400'
                              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {m.emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium flex items-center gap-1">
                      <Tag size={12} />
                      Теги через запятую (необязательно)
                    </label>
                    <input
                      type="text"
                      placeholder="например: тревожность, сон, работа"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={16} />
                        Сохранить запись
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Entry list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
              <Edit3 size={32} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Дневник пока пуст
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Нажмите «Новая запись», чтобы поделиться своими мыслями.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-surface-dark rounded-[3rem] p-5 shadow-sm border border-gray-100 dark:border-transparent hover:shadow-md transition-shadow relative group"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl ${
                      entry.mood_emoji
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {entry.mood_emoji || '💭'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteId(entry.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                      >
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                    {entry.title && (
                      <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">
                        {entry.title}
                      </h3>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3 whitespace-pre-wrap">
                      {entry.content}
                    </p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete confirmation */}
                <AnimatePresence>
                  {deleteId === entry.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 bg-white/95 dark:bg-surface-dark/95 rounded-[3rem] flex items-center justify-center z-10"
                    >
                      <div className="text-center">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          Удалить запись?
                        </p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                          >
                            Удалить
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tip */}
        <div className="mt-8 bg-gradient-to-br from-amber-500/10 to-pink-500/10 dark:from-amber-500/5 dark:to-pink-500/5 rounded-[3rem] p-5 text-center border border-amber-200/30 dark:border-amber-700/30">
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            «Ведение дневника — это разговор с самим собой. Он помогает услышать свой внутренний голос.»
          </p>
        </div>
      </div>
    </div>
  );
}