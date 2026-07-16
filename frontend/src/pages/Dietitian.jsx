import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Settings, BookOpen, Calendar, BarChart3, MessageCircle, Coffee, UtensilsCrossed, Clock, Trash2, Plus, Sparkles, ArrowRight, ChefHat } from 'lucide-react';
import DietitianBackground from '../components/DietitianBackground';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { apiClient } from '../utils/apiClient';

// ---------- Nutrition calculation (Mifflin-St Jeor) ----------
const GOAL_LABELS = { lose: 'Похудение', gain: 'Набор массы', maintain: 'Поддержание веса' };
const ACTIVITY_LEVELS = {
  sedentary:  { label: 'Сидячий',        desc: 'Офисная работа, мало движения',           factor: 1.2 },
  light:      { label: 'Лёгкий',          desc: 'Прогулки, лёгкие тренировки 1–3 р/нед',   factor: 1.375 },
  moderate:   { label: 'Умеренный',       desc: 'Тренировки 3–5 раз в неделю',             factor: 1.55 },
  active:     { label: 'Активный',        desc: 'Интенсивные тренировки 5–7 р/нед',        factor: 1.725 },
  veryActive: { label: 'Очень активный',  desc: 'Тяжёлый физ. труд / спорт каждый день',   factor: 1.9 },
};

const MEAL_EMOJIS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪', other: '🍽️' };
const getMealEmoji = (mealType) => MEAL_EMOJIS[mealType] || '🍽️';

function calculateNutrition(profile, goal, speed, activity) {
  const { height, weight, age, gender } = profile;
  const h = Number(height);
  const w = Number(weight);
  const a = Number(age);

  let bmr;
  if (gender === 'male') {
    bmr = 10 * w + 6.25 * h - 5 * a + 5;
  } else {
    bmr = 10 * w + 6.25 * h - 5 * a - 161;
  }

  const actFactor = (ACTIVITY_LEVELS[activity] || ACTIVITY_LEVELS.sedentary).factor;
  const tdee = Math.round(bmr * actFactor);

  const adjustments = { slow: 250, medium: 500, fast: 750 };
  const adj = adjustments[speed] || 0;

  let targetCals;
  if (goal === 'lose') targetCals = tdee - adj;
  else if (goal === 'gain') targetCals = tdee + adj;
  else targetCals = tdee;

  const protein = Math.round(w * 2.0);
  const fats = Math.round((targetCals * 0.25) / 9);
  const carbs = Math.round((targetCals - protein * 4 - fats * 9) / 4);
  const waterGlasses = Math.round((w * 30) / 250);

  return {
    calories: { current: 0, goal: targetCals },
    protein:  { current: 0, goal: protein },
    fats:     { current: 0, goal: fats },
    carbs:    { current: 0, goal: carbs },
    water:    { current: 0, goal: waterGlasses },
  };
}

// ---------- Onboarding Modal ----------
const OnboardingModal = ({ isOpen, onClose, onComplete, editData }) => {
  const [step, setStep] = useState(editData ? 4 : 1);
  const totalSteps = 4;

  const [profile, setProfile] = useState(editData?.profile || { height: '', weight: '', age: '', gender: 'male' });
  const [goal, setGoal] = useState(editData?.goal || 'lose');
  const [activity, setActivity] = useState(editData?.activity || 'moderate');
  const [speed, setSpeed] = useState(editData?.speed || 'medium');
  const [result, setResult] = useState(
    editData?.nutrition ||
    (editData ? calculateNutrition(editData.profile, editData.goal, editData.speed || 'medium', editData.activity) : null)
  );

  const canAdvance = () => {
    if (step === 2) return profile.height && profile.weight && profile.age && Number(profile.height) > 0 && Number(profile.weight) > 0 && Number(profile.age) > 0;
    return true;
  };

  const handleNext = () => {
    if (step === 1) { setStep(2); }
    else if (step === 2) { setStep(3); }
    else if (step === 3) {
      const nutrition = calculateNutrition(profile, goal, speed, activity);
      setResult(nutrition);
      setStep(4);
    }
  };

  const handleAccept = () => {
    if (result) {
      onComplete({ profile, goal, speed, activity, nutrition: result });
    }
  };

  const handleBack = () => { if (step > 1) setStep(s => s - 1); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-8 bg-green-500' : 'w-4 bg-gray-300 dark:bg-gray-700'}`} />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 min-h-[280px]">
          {/* Шаг 1: Выбор цели */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ваша цель</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Выберите, чего вы хотите достичь.</p>
              <div className="space-y-2">
                {[
                  { key: 'lose', label: '🔥 Похудеть', desc: 'Снижение веса за счёт дефицита калорий' },
                  { key: 'gain', label: '💪 Набрать массу', desc: 'Увеличение веса с профицитом калорий' },
                  { key: 'maintain', label: '⚖️ Поддерживать вес', desc: 'Сохранение текущей формы' },
                ].map(({ key, label, desc }) => (
                  <button key={key} onClick={() => setGoal(key)} className={`w-full text-left p-4 rounded-[2rem] border-2 transition-all ${goal === key ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-green-300'}`}>
                    <p className="font-semibold text-gray-800 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Шаг 2: Параметры */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Расскажите о себе</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Эти данные нужны для точного расчёта вашей нормы калорий.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Рост (см)</label>
                  <input type="number" placeholder="175" value={profile.height} onChange={e => setProfile(p => ({ ...p, height: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-green-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Вес (кг)</label>
                  <input type="number" placeholder="70" value={profile.weight} onChange={e => setProfile(p => ({ ...p, weight: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-green-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Возраст</label>
                  <input type="number" placeholder="30" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-green-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Пол</label>
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] p-1">
                    {[{ key: 'male', label: '♂' }, { key: 'female', label: '♀' }].map(({ key, label }) => (
                      <button key={key} onClick={() => setProfile(p => ({ ...p, gender: key }))} className={`flex-1 py-1.5 rounded-[1.25rem] text-sm font-medium transition-colors ${profile.gender === key ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500'}`}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Шаг 3: Уровень подвижности */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Уровень подвижности</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Выберите ваш уровень физической активности.</p>
              <div className="space-y-1.5">
                {Object.entries(ACTIVITY_LEVELS).map(([key, { label, desc }]) => (
                  <button key={key} onClick={() => setActivity(key)} className={`w-full text-left px-4 py-3 rounded-[1.5rem] border-2 transition-all ${activity === key ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-green-300'}`}>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{goal === 'maintain' ? 'Подтверждение' : 'Скорость изменений'}</h3>
                {goal === 'maintain' ? (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-[2rem] p-5 text-center">
                    <p className="text-lg font-semibold text-gray-800 dark:text-white">⚖️ Поддержание веса</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Калории будут рассчитаны на поддержание текущего веса.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[
                      { key: 'slow', label: '🐢 Медленно', desc: goal === 'lose' ? '−0.25 кг в неделю' : '+0.25 кг в неделю' },
                      { key: 'medium', label: '🐇 Умеренно', desc: goal === 'lose' ? '−0.5 кг в неделю' : '+0.5 кг в неделю' },
                      { key: 'fast', label: '🚀 Быстро', desc: goal === 'lose' ? '−0.75 кг в неделю' : '+0.75 кг в неделю' },
                    ].map(({ key, label, desc }) => (
                      <button key={key} onClick={() => setSpeed(key)} className={`w-full text-left p-4 rounded-[2rem] border-2 transition-all ${speed === key ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-green-300'}`}>
                        <p className="font-semibold text-gray-800 dark:text-white">{label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Шаг 4: Результат КБЖУ */}
          {step === 4 && result && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">🎉 Ваш идеальный КБЖУ</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ixteria рассчитала вашу дневную норму на основе ваших данных.</p>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-[2rem] p-5 text-center">
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{result.calories.goal}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">ккал в день</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[1.5rem] p-3 text-center">
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{result.protein.goal} г</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Белки</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[1.5rem] p-3 text-center">
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{result.fats.goal} г</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Жиры</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-[1.5rem] p-3 text-center">
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{result.carbs.goal} г</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Углеводы</p>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-[2rem] p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💧 Вода: <span className="font-semibold text-gray-800 dark:text-white">{result.water.goal} стаканов</span> в день
                </p>
              </div>

              <div className="text-center pt-2">
                <button onClick={handleAccept} className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-[2rem] transition-colors">
                  Принять
                </button>
              </div>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="flex items-center justify-between px-6 pb-6 pt-2">
            <button onClick={handleBack} disabled={step === 1} className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={18} />Назад</button>
            <button onClick={handleNext} disabled={!canAdvance()} className="flex items-center gap-1 px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-[2rem] transition-colors disabled:cursor-not-allowed">Далее<ChevronRight size={18} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Profile Modal (when user already has data) ----------
const ProfileModal = ({ isOpen, onClose, userProfile, nutrition, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const goalLabels = { lose: '🔥 Похудеть', gain: '💪 Набрать массу', maintain: '⚖️ Поддерживать вес' };
  const activityLabels = {
    sedentary: 'Сидячий',
    light: 'Лёгкий',
    moderate: 'Умеренный',
    active: 'Активный',
    veryActive: 'Очень активный',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Sparkles size={22} className="text-green-500" />
            Ваши параметры
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
              title="Удалить настройки"
            >
              <Trash2 size={18} className="text-red-400 hover:text-red-500" />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-4">
          {/* User info card */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-[2rem] p-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">📋 Ваши данные</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white dark:bg-gray-800 rounded-[1.25rem] p-3 text-center">
                <p className="text-xs text-gray-400">Рост</p>
                <p className="font-bold text-gray-800 dark:text-white">{userProfile.profile.height} см</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-[1.25rem] p-3 text-center">
                <p className="text-xs text-gray-400">Вес</p>
                <p className="font-bold text-gray-800 dark:text-white">{userProfile.profile.weight} кг</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-[1.25rem] p-3 text-center">
                <p className="text-xs text-gray-400">Возраст</p>
                <p className="font-bold text-gray-800 dark:text-white">{userProfile.profile.age} лет</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-[1.25rem] p-3 text-center">
                <p className="text-xs text-gray-400">Пол</p>
                <p className="font-bold text-gray-800 dark:text-white">{userProfile.profile.gender === 'male' ? '♂ Мужской' : '♀ Женский'}</p>
              </div>
            </div>
          </div>

          {/* Goal & Activity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">🎯 Цель</p>
              <p className="font-semibold text-gray-800 dark:text-white text-sm">{goalLabels[userProfile.goal] || userProfile.goal}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">🏃 Активность</p>
              <p className="font-semibold text-gray-800 dark:text-white text-sm">{activityLabels[userProfile.activity] || userProfile.activity}</p>
            </div>
          </div>

          {/* KBJU result */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-4">
            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-2">📊 Рассчитанный КБЖУ</p>
            <div className="text-center mb-3">
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{nutrition.calories.goal}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400"> ккал/день</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="font-bold text-gray-800 dark:text-white">{nutrition.protein.goal} г</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Белки</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white">{nutrition.fats.goal} г</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Жиры</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white">{nutrition.carbs.goal} г</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Углеводы</p>
              </div>
            </div>
            <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-400">
              💧 Вода: <span className="font-semibold text-gray-800 dark:text-white">{nutrition.water.goal} ст.</span> в день
            </div>
          </div>

          {/* Info text */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-[2rem] p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Для изменения параметров пройдите воронку заново через кнопку «Укажите параметры»
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button onClick={onClose} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-[2rem] transition-colors">
            Закрыть
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 p-6 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Удалить настройки?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Все ваши параметры и рассчитанный КБЖУ будут удалены. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-[2rem] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); onDelete?.(); onClose(); }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-[2rem] transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Manual Modal ----------
const ManualModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <BookOpen size={22} className="text-green-500" />
            Как пользоваться диетологом
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-5 text-sm">
          {/* Step 1 */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-[2rem] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-1">Настройте профиль</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Нажмите <span className="font-medium text-green-600 dark:text-green-400">⚙️ Ваш профиль</span> и ответьте на несколько вопросов: рост, вес, пол, возраст, уровень активности и цель. Ixteria автоматически рассчитает вашу норму КБЖУ и воды для персонализированных рекомендаций.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 — 3 способа отслеживания КБЖУ */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-2">3 способа отслеживать КБЖУ</p>

                {/* Способ 1: Фото */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📸</span>
                    <span className="font-medium text-sm text-blue-700 dark:text-blue-300">Фото блюда</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pl-8">
                    Сфотографируйте еду и отправьте снимок в чат — диетолог сам проанализирует состав блюда, определит продукты и рассчитает калорийность.
                  </p>
                </div>

                {/* Способ 2: Список продуктов в чате */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📝</span>
                    <span className="font-medium text-sm text-blue-700 dark:text-blue-300">Список продуктов в чате</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pl-8">
                    Напишите в чат, что и в каком количестве вы съели. Например: <span className="italic">«На завтрак овсянка на молоке 250 г с бананом, кофе с молоком без сахара»</span>. Диетолог разберёт каждое блюдо по КБЖУ и внесёт в дневник.
                  </p>
                </div>

                {/* Способ 3: Штрихкод */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📊</span>
                    <span className="font-medium text-sm text-blue-700 dark:text-blue-300">Сканирование штрихкода</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pl-8">
                    Воспользуйтесь сканированием штрихкодов продуктов в разделе <span className="font-medium text-blue-600 dark:text-blue-400">«Диетолог»</span> для максимально точного и быстрого добавления в рацион. Просто наведите камеру на штрихкод упаковки — все данные подтянутся автоматически.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-1">Ixteria всё посчитает</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Ассистент автоматически распознает продукты любым из способов, добавит их в ваш дневник питания, посчитает калории и БЖУ. Вы сразу увидите, сколько осталось до дневной нормы, и получите персональные рекомендации.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3.5 — Генерация рациона */}
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">★</div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-2">Генерация рациона и приготовление с Ixteria</p>

                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🥗</span>
                    <span className="font-medium text-sm text-rose-700 dark:text-rose-300">Создать идеальный план питания</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pl-8">
                    Нажмите <span className="font-medium text-rose-600 dark:text-rose-400">«Создайте идеальный план питания»</span> на главной странице диетолога или откройте раздел <span className="font-medium text-rose-600 dark:text-rose-400">«План питания»</span>. Ixteria сгенерирует персональный рацион на день с учётом вашего КБЖУ, предпочтений и цели. Вы можете написать свои пожелания (например, «без молочки» или «побольше белка»).
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">👨‍🍳</span>
                    <span className="font-medium text-sm text-rose-700 dark:text-rose-300">Приготовить блюдо с Ixteria</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pl-8">
                    У каждого блюда в сгенерированном рационе есть кнопка <span className="font-medium text-rose-600 dark:text-rose-400">«Приготовить с ixteria»</span>. Нажмите её — откроется чат, где Ixteria даст пошаговый рецепт этого блюда, расскажет о технологии приготовления и ответит на любые вопросы. Идеально, когда вы хотите не просто знать, что есть, но и <span className="italic">как это приготовить</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-1">Анализируйте прогресс</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  В <span className="font-medium text-amber-600 dark:text-amber-400">📅 Дневнике записей</span> смотрите историю питания по дням, аналитику за неделю и месяц. Отслеживайте, каких нутриентов не хватает, а каких — перебор. Корректируйте рацион на основе данных.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button onClick={onClose} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-[2rem] transition-colors">Понятно!</button>
        </div>
      </div>
    </div>
  );
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const FoodDiaryModal = ({ isOpen, onClose, nutritionGoal, userId }) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week' | 'month'
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [meals, setMeals] = useState([]);
  const [dayTotals, setDayTotals] = useState({ calories: 0, protein: 0, fats: 0, carbs: 0 });
  const [weekData, setWeekData] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [datesWithFood, setDatesWithFood] = useState({});

  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const selectedDateStr = formatDate(selectedDate);

  // Load day data
  useEffect(() => {
    if (!isOpen) return;
    const loadDay = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get(`/api/user/${userId}/food-by-date?date=${selectedDateStr}`);
        setDayTotals(data.totals);
        const transformed = data.items.map(item => ({
          id: item.id,
          icon: getMealEmoji(item.meal_type),
          name: item.product_name,
          time: item.consumed_at ? new Date(item.consumed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—',
          portion: `${item.grams} г`,
          calories: item.calories,
          protein: item.protein,
          fats: item.fats,
          carbs: item.carbs,
        }));
        setMeals(transformed);
      } catch (e) {
        console.warn('Failed to load food by date:', e);
        setMeals([]);
        setDayTotals({ calories: 0, protein: 0, fats: 0, carbs: 0 });
      }
      setLoading(false);
    };
    loadDay();
  }, [selectedDateStr, isOpen]);

  // Load month's food presence (for calendar dots)
  useEffect(() => {
    if (!isOpen) return;
    const start = formatDate(new Date(calendarYear, calendarMonth, 1));
    const end = formatDate(new Date(calendarYear, calendarMonth + 1, 0));
    const load = async () => {
      try {
        const { data } = await apiClient.get(`/api/user/${userId}/food-date-range?start_date=${start}&end_date=${end}`);
        setDatesWithFood(data.days || {});
      } catch (e) { console.warn('Failed to load date range:', e); }
    };
    load();
  }, [calendarMonth, calendarYear, isOpen]);

  // Load week data
  useEffect(() => {
    if (!isOpen || viewMode !== 'week') return;
    const end = formatDate(selectedDate);
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 6);
    const start = formatDate(startDate);
    const load = async () => {
      try {
        const { data } = await apiClient.get(`/api/user/${userId}/food-date-range?start_date=${start}&end_date=${end}`);
        setWeekData(data);
      } catch (e) { console.warn('Failed to load week data:', e); }
    };
    load();
  }, [viewMode, selectedDateStr, isOpen]);

  // Load month data
  useEffect(() => {
    if (!isOpen || viewMode !== 'month') return;
    const end = formatDate(selectedDate);
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 29);
    const start = formatDate(startDate);
    const load = async () => {
      try {
        const { data } = await apiClient.get(`/api/user/${userId}/food-date-range?start_date=${start}&end_date=${end}`);
        setMonthData(data);
      } catch (e) { console.warn('Failed to load month data:', e); }
    };
    load();
  }, [viewMode, selectedDateStr, isOpen]);

  // Calendar helpers
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1; // Monday = 0
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
  const isSelected = (day) => day === selectedDate.getDate() && calendarMonth === selectedDate.getMonth() && calendarYear === selectedDate.getFullYear();

  // Compute week stats
  const weekStats = useMemo(() => {
    if (!weekData?.days) return { calories: 0, days: 0, daysData: {} };
    const days = weekData.days;
    const total = Object.values(days).reduce((s, d) => s + d.calories, 0);
    const count = Object.keys(days).length;
    return { calories: total, days: count, daysData: days };
  }, [weekData]);

  // Compute month stats
  const monthStats = useMemo(() => {
    if (!monthData?.days) return { calories: 0, days: 0, daysData: {} };
    const days = monthData.days;
    const total = Object.values(days).reduce((s, d) => s + d.calories, 0);
    const count = Object.keys(days).length;
    return { calories: total, days: count, daysData: days };
  }, [monthData]);

  // Generate week bar data
  const weekBars = useMemo(() => {
    const bars = [];
    const goal = nutritionGoal || 2000;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      const dayOfWeek = WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
      const val = weekStats.daysData[key]?.calories || 0;
      bars.push({ label: dayOfWeek, val, key });
    }
    const maxVal = Math.max(...bars.map(b => b.val), goal);
    return bars.map(b => ({ ...b, maxVal, over: b.val > goal }));
  }, [weekStats, selectedDate, nutritionGoal]);

  // Generate month bar data
  const monthBars = useMemo(() => {
    const bars = [];
    const goal = nutritionGoal || 2000;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      const val = monthStats.daysData[key]?.calories || 0;
      bars.push({ val, key, over: val > goal });
    }
    const maxVal = Math.max(...bars.map(b => b.val), goal || 2800);
    return bars.map(b => ({ ...b, maxVal }));
  }, [monthStats, selectedDate, nutritionGoal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Calendar size={22} className="text-green-500" />
            Дневник записей
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 mx-6 mb-3 bg-gray-100 dark:bg-gray-800 rounded-[2rem] p-1">
          {[
            { key: 'day', label: 'День' },
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`flex-1 py-2 rounded-[1.75rem] text-sm font-medium transition-colors ${viewMode === key ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 overflow-y-auto flex-1 space-y-4">
          {/* ===== CALENDAR ===== */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-4">
            {/* Month navigation */}
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

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map(w => (
                <div key={w} className="text-center text-xs font-medium text-gray-400 py-1">{w}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth(calendarYear, calendarMonth) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth(calendarYear, calendarMonth) }).map((_, i) => {
                const day = i + 1;
                const dateKey = formatDate(new Date(calendarYear, calendarMonth, day));
                const hasFood = datesWithFood[dateKey]?.count > 0;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(new Date(calendarYear, calendarMonth, day))}
                    className={`aspect-square rounded-full text-sm font-medium flex flex-col items-center justify-center transition-all relative ${isSelected(day) ? 'bg-green-500 text-white' : isToday(day) ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    {day}
                    {hasFood && !isSelected(day) && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-green-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===== DAY VIEW ===== */}
          {viewMode === 'day' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <UtensilsCrossed size={16} className="text-green-500" />
                  {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>

              {loading ? (
                <div className="text-center py-6 text-gray-400">Загрузка...</div>
              ) : meals.length === 0 ? (
                <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                  <Coffee size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Нет записей о питании</p>
                  <p className="text-xs mt-1">Напишите в чат, что вы съели</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {meals.map((meal, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-[1.5rem]">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                        {meal.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{meal.name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Clock size={10} />
                          <span>{meal.time}</span>
                          <span className="mx-1">·</span>
                          <span>{meal.portion}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{meal.calories} ккал</p>
                        <p className="text-xs text-gray-400">Б{meal.protein} Ж{meal.fats} У{meal.carbs}</p>
                      </div>
                    </div>
                  ))}

                  {/* Day totals */}
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-[1.5rem] border border-green-200 dark:border-green-800">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">Итого за день</p>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white">{dayTotals.calories}</p>
                        <p className="text-xs text-gray-400">ккал</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white">{dayTotals.protein} г</p>
                        <p className="text-xs text-gray-400">белки</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white">{dayTotals.fats} г</p>
                        <p className="text-xs text-gray-400">жиры</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white">{dayTotals.carbs} г</p>
                        <p className="text-xs text-gray-400">углеводы</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== WEEK VIEW ===== */}
          {viewMode === 'week' && (
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-green-500" />
                Анализ за неделю
              </h3>

              {/* Week bar chart */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-4 mb-4">
                <p className="text-xs text-gray-400 mb-3 text-center">Калории по дням</p>
                <div className="flex items-end justify-between gap-1 h-32">
                  {weekBars.map((bar) => {
                    const h = bar.maxVal > 0 ? (bar.val / bar.maxVal) * 100 : 0;
                    return (
                      <div key={bar.key} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{bar.val}</span>
                        <div className={`w-full rounded-t-lg ${bar.over ? 'bg-red-400' : 'bg-green-400'}`} style={{ height: `${Math.max(h, 2)}%` }} />
                        <span className="text-xs text-gray-400">{bar.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs text-gray-400">—— Норма: {nutritionGoal || 2000} ккал</span>
                </div>
              </div>

              {/* Week totals */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem]">
                <p className="text-xs font-medium text-gray-500 mb-3">Сводка за неделю</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-3 text-center">
                    <p className="font-bold text-gray-800 dark:text-white">{weekStats.calories.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">всего ккал</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-3 text-center">
                    <p className="font-bold text-gray-800 dark:text-white">{weekStats.days > 0 ? Math.round(weekStats.calories / weekStats.days).toLocaleString() : 0}</p>
                    <p className="text-xs text-gray-400">среднее ккал/день</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== MONTH VIEW ===== */}
          {viewMode === 'month' && (
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-green-500" />
                Анализ за месяц
              </h3>

              {/* Month bar chart */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-4 mb-4">
                <p className="text-xs text-gray-400 mb-3 text-center">Калории по дням (последние 30 дней)</p>
                <div className="flex items-end gap-[2px] h-24">
                  {monthBars.map((bar, i) => {
                    const h = bar.maxVal > 0 ? (bar.val / bar.maxVal) * 100 : 0;
                    return (
                      <div key={bar.key} className="flex-1 flex flex-col items-center">
                        <div className={`w-full rounded-t-sm ${bar.over ? 'bg-red-400' : 'bg-green-400'}`} style={{ height: `${Math.max(h, 2)}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs text-gray-400">—— Норма: {nutritionGoal || 2000} ккал</span>
                </div>
              </div>

              {/* Month totals */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem]">
                <p className="text-xs font-medium text-gray-500 mb-3">Сводка за месяц</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-3 text-center">
                    <p className="font-bold text-gray-800 dark:text-white">{monthStats.calories.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">всего ккал</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-3 text-center">
                    <p className="font-bold text-gray-800 dark:text-white">{monthStats.days > 0 ? Math.round(monthStats.calories / monthStats.days).toLocaleString() : 0}</p>
                    <p className="text-xs text-gray-400">среднее ккал/день</p>
                  </div>
                </div>

                {/* Trend insight */}
                {monthStats.days > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-[1.5rem] border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">📈 Тренд</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      В среднем вы потребляете {Math.round(monthStats.calories / monthStats.days).toLocaleString()} ккал в день.
                      {(nutritionGoal || 2000) > Math.round(monthStats.calories / monthStats.days)
                        ? ` Это на ${(nutritionGoal || 2000) - Math.round(monthStats.calories / monthStats.days)} ккал ниже нормы — добавьте полезные перекусы.`
                        : ` Это на ${Math.round(monthStats.calories / monthStats.days) - (nutritionGoal || 2000)} ккал выше нормы — подумайте о снижении порций.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2">
          <button onClick={onClose} className="w-full py-3 bg-gray-800 dark:bg-white dark:text-gray-900 text-white font-medium rounded-[2rem] transition-colors hover:bg-gray-700 dark:hover:bg-gray-100">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== Main Dietitian Page ==========
const FOOD_CHAT_STORAGE_KEY = 'dietitian_food_chat_id';

// Изолированный ключ localStorage, привязанный к userId
const getDietitianProfileKey = (userId) => userId ? `dietitian_profile_${userId}` : null;

// Синхронная инициализация профиля из localStorage (без задержки при переходе)
const getInitialProfile = () => {
  return null;
};

const getInitialNutrition = () => {
  return {
    calories: { current: 0, goal: 2000 },
    protein: { current: 0, goal: 120 },
    fats: { current: 0, goal: 65 },
    carbs: { current: 0, goal: 250 },
    water: { current: 0, goal: 8 },
  };
};

const Dietitian = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { userId } = useUser();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [userProfile, setUserProfile] = useState(getInitialProfile());
  const [todayMeals, setTodayMeals] = useState([]);
  const [deleteState, setDeleteState] = useState(null); // 'confirming' | null
  const [dietPlan, setDietPlan] = useState(null); // today's diet plan

  const [nutrition, setNutrition] = useState(getInitialNutrition());

  // Load diet profile from API on mount, with localStorage fallback
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await apiClient.get(`/api/user/${userId}/diet-profile`);
        if (data && data.height != null) {
          const profile = { height: data.height, weight: data.weight, age: data.age, gender: data.gender };
          const goal = data.goal;
          const activity = data.activity_level;
          setUserProfile({ profile, goal, speed: 'medium', activity });
          setNutrition(prev => ({
            ...prev,
            calories: { ...prev.calories, goal: data.calorie_target },
            protein:  { ...prev.protein, goal: data.protein_target },
            fats:     { ...prev.fats, goal: data.fats_target },
            carbs:    { ...prev.carbs, goal: data.carbs_target },
            water:    { ...prev.water, goal: data.water_target },
          }));
          // Also sync to localStorage (isolated per user)
          try {
            const lsKey = getDietitianProfileKey(userId);
            if (lsKey) {
              localStorage.setItem(lsKey, JSON.stringify({
                profile, goal, speed: 'medium', activity,
                nutrition: {
                  calories: { current: 0, goal: data.calorie_target },
                  protein:  { current: 0, goal: data.protein_target },
                  fats:     { current: 0, goal: data.fats_target },
                  carbs:    { current: 0, goal: data.carbs_target },
                  water:    { current: 0, goal: data.water_target },
                }
              }));
            }
          } catch {}
          return;
        }
      } catch (e) {
        console.warn('Failed to load diet profile from API, falling back to localStorage:', e);
      }

      // Fallback: load from localStorage (isolated per user)
      try {
        const lsKey = getDietitianProfileKey(userId);
        if (lsKey) {
          const saved = localStorage.getItem(lsKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            setUserProfile({ profile: parsed.profile, goal: parsed.goal, speed: parsed.speed, activity: parsed.activity });
            setNutrition(parsed.nutrition);
          }
        }
      } catch (e) {
        console.warn('Failed to load dietitian profile from localStorage:', e);
      }
    };
    loadProfile();
  }, [userId]);

  // Load today's diet plan
  const loadDietPlan = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/api/dietplan/${userId}`);
      if (data && data.plan_data) {
        try {
          const parsed = JSON.parse(data.plan_data);
          setDietPlan(parsed);
        } catch (e) {
          setDietPlan(null);
        }
      } else {
        setDietPlan(null);
      }
    } catch (e) {
      console.warn('Failed to load diet plan:', e);
      setDietPlan(null);
    }
  }, [userId]);

  useEffect(() => {
    loadDietPlan();
  }, [loadDietPlan]);

  // Load today's food consumption from API
  const loadFoodToday = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/api/user/${userId}/food-today?_t=${Date.now()}`);
      if (data) {
        setNutrition(prev => ({
          ...prev,
          calories: { current: data.totals.calories, goal: data.profile?.calorie_target || prev.calories.goal },
          protein:  { current: data.totals.protein, goal: data.profile?.protein_target || prev.protein.goal },
          fats:     { current: data.totals.fats, goal: data.profile?.fats_target || prev.fats.goal },
          carbs:    { current: data.totals.carbs, goal: data.profile?.carbs_target || prev.carbs.goal },
          water:    { current: 0, goal: data.profile?.water_target || prev.water.goal },
        }));
        
        // Transform items to meal format for the UI
        const transformedMeals = data.items.map(item => ({
          id: item.id,
          icon: getMealEmoji(item.meal_type),
          name: item.product_name,
          time: new Date(item.consumed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          portion: `${item.grams} г`,
          calories: item.calories,
          protein: item.protein,
          fats: item.fats,
          carbs: item.carbs,
          meal_type: item.meal_type,
        }));
        setTodayMeals(transformedMeals);
      }
    } catch (e) {
      console.warn('Failed to load food today from API:', e);
    }
  }, [userId]);

  // Load food data on mount and set up periodic refresh
  useEffect(() => {
    loadFoodToday();
    const interval = setInterval(loadFoodToday, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [loadFoodToday]);

  // Immediately refresh when page becomes visible or gets focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadFoodToday();
      }
    };
    const handleFocus = () => {
      loadFoodToday();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadFoodToday]);

  const handleOnboardingComplete = useCallback(async ({ profile, goal, speed, activity, nutrition: calcNutrition }) => {
    const data = { profile, goal, speed, activity, nutrition: calcNutrition };
    setUserProfile({ profile, goal, speed, activity });
    setNutrition(calcNutrition);
    setShowOnboarding(false);

    // Always save to localStorage (isolated per user)
    try {
      const lsKey = getDietitianProfileKey(userId);
      if (lsKey) {
        localStorage.setItem(lsKey, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Failed to save dietitian profile to localStorage:', e);
    }

    // Save to backend API
    try {
      await apiClient.put(`/api/user/${userId}/diet-profile`, {
        height: Number(profile.height),
        weight: Number(profile.weight),
        age: Number(profile.age),
        gender: profile.gender,
        goal: goal,
        activity_level: activity,
        calorie_target: calcNutrition.calories.goal,
        protein_target: calcNutrition.protein.goal,
        fats_target: calcNutrition.fats.goal,
        carbs_target: calcNutrition.carbs.goal,
        water_target: calcNutrition.water.goal,
      });
    } catch (e) {
      console.warn('Failed to save diet profile to API (profile will still work via localStorage):', e);
    }
  }, []);

  const handleDeleteMeal = useCallback(async (foodId) => {
    try {
      await apiClient.delete(`/api/food/${foodId}`);
      // Refresh after delete
      loadFoodToday();
    } catch (e) {
      console.warn('Failed to delete food item:', e);
    }
  }, [loadFoodToday]);

  const handleDeleteProfile = useCallback(() => {
    // Clear state
    setUserProfile(null);
    setNutrition({
      calories: { current: 0, goal: 2000 },
      protein: { current: 0, goal: 120 },
      fats: { current: 0, goal: 65 },
      carbs: { current: 0, goal: 250 },
      water: { current: 0, goal: 8 },
    });
    setShowOnboarding(false);
    setShowProfile(false);
    // Clear localStorage (isolated per user)
    try {
      const lsKey = getDietitianProfileKey(userId);
      if (lsKey) {
        localStorage.removeItem(lsKey);
      }
    } catch (e) {
      console.warn('Failed to remove dietitian profile from localStorage:', e);
    }
    // Clear backend
    try {
      apiClient.delete(`/api/user/${userId}/diet-profile`);
    } catch (e) {
      console.warn('Failed to delete diet profile from API:', e);
    }
  }, []);

  const handleTopButtonClick = () => {
    if (userProfile) {
      setShowProfile(true);
    } else {
      setShowOnboarding(true);
    }
  };

  const WELCOME_MESSAGE = `👋 Привет! Я твой диетолог.
Расскажи, что ты съел сегодня — я помогу посчитать калории и БЖУ!

🥗 Как мне помочь тебе с расчетами:

📸 Фото блюда: отправь снимок, и я проанализирую его состав и калорийность.

📝 Список продуктов: напиши продукты и их граммовки напрямую, и я внесу их в твой рацион.

📊 Штрихкод: воспользуйся сканированием в разделе «Диетолог» для максимально точного отслеживания.

Жду твой рацион!`;

  const handleAddFood = useCallback(async () => {
    try {
      const chatResponse = await apiClient.post('/api/chats', {
        title: '🍽️ Дневник питания',
        user_id: userId,
        agent_type: 'dietitian',
        welcome_message: WELCOME_MESSAGE,
      });
      const chatId = chatResponse.data.id || chatResponse.data.chat_id;

      // Редиректим в чат — сообщение уже сохранено мгновенно, без LLM
      navigate(`/chat/${chatId}`);
    } catch (e) {
      console.error('Не удалось создать новый чат:', e);
    }
  }, [navigate, userId]);

  const handleChatWithDietitian = useCallback(async () => {
    try {
      const chatResponse = await apiClient.post('/api/chats', {
        title: '💬 Чат с диетологом',
        user_id: userId,
        agent_type: 'dietitian',
        welcome_message: '👋 Здравствуйте! Я ваш персональный диетолог. Чем могу помочь? Расскажите, что вас интересует: составление рациона, вопросы по питанию или что-то ещё?',
      });
      const chatId = chatResponse.data.id || chatResponse.data.chat_id;

      // Редиректим в чат с диетологом
      navigate(`/chat/${chatId}`);
    } catch (e) {
      console.error('Не удалось создать чат с диетологом:', e);
    }
  }, [navigate, userId]);

  const caloriesProgress = Math.min(
    nutrition.calories.goal > 0 ? (nutrition.calories.current / nutrition.calories.goal) * 100 : 0, 100
  );
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (caloriesProgress / 100) * circumference;
  const remaining = nutrition.calories.goal - nutrition.calories.current;

  return (
    <>
      <div className="absolute inset-0 pointer-events-none z-0">
        <DietitianBackground />
      </div>
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8">
        <style>{`
          @keyframes agent-float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-4px) rotate(-2deg); }
            50% { transform: translateY(0) rotate(0deg); }
            75% { transform: translateY(-2px) rotate(1deg); }
          }
          .agent-float-icon {
            animation: agent-float 3s ease-in-out infinite;
          }
          .agent-float-icon:hover {
            animation-duration: 0.6s;
          }
          @keyframes dietitian-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          .dietitian-bounce {
            animation: dietitian-bounce 2.5s ease-in-out infinite;
          }
        `}</style>
      <div className="max-w-2xl mx-auto">
        {/* ===== Блок "Ваши параметры / Укажите параметры" ===== */}
        <div
          onClick={handleTopButtonClick}
          className="bg-gradient-to-r from-green-500/90 via-emerald-500/90 to-green-600/90 dark:from-green-500/85 dark:via-emerald-500/85 dark:to-green-600/85 rounded-[3rem] p-4 mb-4 flex items-center gap-3 border-2 border-green-300/70 dark:border-green-400/60 cursor-pointer hover:from-green-500 hover:via-emerald-500 hover:to-green-600 dark:hover:from-green-500 dark:hover:via-emerald-500 dark:hover:to-green-600 backdrop-blur-md shadow-lg transition-all duration-300"
        >
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0">
            <Sparkles size={18} className="text-green-600 dark:text-green-400" />
          </div>
              <p className="text-sm text-white flex-1">
            {userProfile ? 'Ваши параметры, нажмите, чтобы изменить' : 'Укажите ваши параметры и цель, Ixteria расчитает для вас идеальный состав КБЖУ.'}
          </p>
          <div className="p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-black/20 text-green-500 hover:text-green-600 dark:hover:text-green-400 transition-colors shrink-0">
            <ArrowRight size={16} />
          </div>
        </div>

        {/* ===== Dashboard Widgets (3 columns) ===== */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Widget 1: Manual */}
          <button
            onClick={() => setShowManual(true)}
          className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 sm:p-5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent backdrop-blur-lg"
        >
            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
              Как пользоваться
            </span>
          </div>
        </button>

          {/* Widget 2: Food Diary */}
          <button
            onClick={() => setShowDiary(true)}
          className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 sm:p-5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent backdrop-blur-lg"
        >
          <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Calendar size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
              Дневник питания
            </span>
          </div>
        </button>

          {/* Widget 3: Chat with Dietitian */}
          <button
            onClick={handleChatWithDietitian}
            className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-4 sm:p-5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent backdrop-blur-lg"
          >
            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center overflow-hidden dietitian-bounce">
                <img
                  src="/assets/icons/agents/диетолог.svg"
                  alt="Диетолог"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                Чат с диетологом
              </span>
            </div>
          </button>
        </div>

        {/* ===== Calorie Counter (Center) ===== */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-48 h-48 mb-2 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl rounded-full shadow-lg">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="12" className="text-gray-200 dark:text-gray-700" />
              <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className="text-green-500" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-800 dark:text-white">{nutrition.calories.current}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">из {nutrition.calories.goal} ккал</span>
              <span className={`text-xs font-medium mt-0.5 ${remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {remaining >= 0 ? `Осталось ${remaining}` : `Перебор ${Math.abs(remaining)}`}
              </span>
            </div>
          </div>
        </div>

        {/* ===== БЖУ row ===== */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: 'Белки', current: nutrition.protein.current, goal: nutrition.protein.goal, unit: 'г', color: 'bg-blue-500', icon: '🥩' },
            { label: 'Жиры', current: nutrition.fats.current, goal: nutrition.fats.goal, unit: 'г', color: 'bg-amber-500', icon: '🥑' },
            { label: 'Углеводы', current: nutrition.carbs.current, goal: nutrition.carbs.goal, unit: 'г', color: 'bg-orange-500', icon: '🍞' },
          ].map((item) => (
            <div key={item.label} className="p-2.5 bg-white/95 dark:bg-surface-dark rounded-[1.5rem] text-center shadow-sm border border-gray-100 dark:border-transparent backdrop-blur-lg">
              <div className="text-sm font-bold text-gray-800 dark:text-white mb-0.5">
                {item.current}<span className="text-[10px] font-normal text-gray-400">/{item.goal} {item.unit}</span>
              </div>
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${Math.min((item.current / (item.goal || 1)) * 100, 100)}%` }} />
              </div>
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1">{item.icon} {item.label}</div>
            </div>
          ))}
        </div>

        {/* ===== Виджет "Создайте идеальный план питания" (над списком еды) ===== */}
        <button
          onClick={() => navigate('/dietitian/plan')}
          className="w-full bg-gradient-to-br from-green-500 via-emerald-600 to-green-700 hover:from-green-600 hover:via-emerald-700 hover:to-green-800 text-white rounded-[3rem] p-6 mb-4 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/25 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-4 relative overflow-hidden group"
        >
          {/* Декоративный фон */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:w-32 group-hover:h-32 transition-all duration-500" />
          <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-lg group-hover:w-28 group-hover:h-28 transition-all duration-500" />
          <div className="absolute right-12 bottom-0 w-16 h-16 bg-white/5 rounded-full blur-md group-hover:w-20 group-hover:h-20 transition-all duration-500" />

          {/* Иконка */}
          <div className="flex-shrink-0 w-[4.5rem] h-[4.5rem] rounded-full bg-white/20 backdrop-blur flex items-center justify-center agent-float-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
              <line x1="6" y1="17" x2="18" y2="17" />
            </svg>
          </div>

          {/* Текст */}
          <div className="text-left flex-1 relative z-10">
            <span className="text-base font-bold block leading-snug">Создайте идеальный план питания</span>
            <span className="text-xs text-green-100/80 block mt-0.5">под ваши параметры</span>
          </div>

          {/* Стрелка */}
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/25 transition-colors relative z-10">
            <ChevronRight size={18} className="text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* ===== Съедено сегодня ===== */}
        <div className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-6 mb-6 shadow-sm border border-gray-100 dark:border-transparent backdrop-blur-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              🍽️ Съедено сегодня
            </h2>
            <button
              onClick={handleAddFood}
              className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
              title="Добавить еду через чат"
            >
              <Plus size={20} />
            </button>
          </div>
          {todayMeals.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🍴</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Вы ещё ничего не съели сегодня</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Напишите в чат, что вы съели — блюда появятся здесь</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayMeals.map((meal, i) => (
                <div key={meal.id || i} className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700/50 rounded-[2rem] p-3 group relative">
                  <div className="text-2xl flex-shrink-0">{meal.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{meal.name}</p>
                    <p className="text-xs text-gray-400">{meal.time} · {meal.portion}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">{meal.calories} ккал</p>
                    <p className="text-xs text-gray-400">Б {meal.protein} · Ж {meal.fats} · У {meal.carbs}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMeal(meal.id)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== Рацион на день ===== */}
        <div className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-6 mb-6 shadow-sm border border-gray-100 dark:border-transparent backdrop-blur-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              🥗 Рацион на день
            </h2>
          </div>
          {dietPlan && dietPlan.meals && dietPlan.meals.length > 0 ? (
            <div className="space-y-3">
              {dietPlan.meals.map((meal, mealIdx) => (
                <div key={mealIdx} className="bg-gray-100 dark:bg-gray-700/50 rounded-[2rem] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{meal.type === 'breakfast' ? '🌅' : meal.type === 'lunch' ? '☀️' : meal.type === 'dinner' ? '🌙' : meal.type === 'snack' ? '🍪' : '🍽️'}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200 text-sm flex-1">
                      {meal.type === 'breakfast' ? 'Завтрак' : meal.type === 'lunch' ? 'Обед' : meal.type === 'dinner' ? 'Ужин' : meal.type === 'snack' ? 'Перекус' : 'Приём пищи'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {meal.dishes ? meal.dishes.reduce((sum, d) => sum + (parseInt(d.calories) || 0), 0) : 0} ккал
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(meal.dishes || []).map((dish, dishIdx) => (
                      <div key={dishIdx} className="flex items-center gap-2 pl-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                          {dishIdx + 1}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{dish.name || dish.title}</span>
                        {dish.portion && <span className="text-xs text-gray-400">{dish.portion}</span>}
                        {dish.calories && <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{dish.calories} ккал</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {/* Totals */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-[1.5rem] p-3 flex items-center justify-around text-sm border border-green-200 dark:border-green-800">
                {(() => {
                  const totalCals = dietPlan.meals.reduce((s, m) => s + (m.dishes || []).reduce((s2, d) => s2 + (parseInt(d.calories) || 0), 0), 0);
                  const totalProtein = dietPlan.meals.reduce((s, m) => s + (m.dishes || []).reduce((s2, d) => s2 + (parseInt(d.protein) || 0), 0), 0);
                  const totalFats = dietPlan.meals.reduce((s, m) => s + (m.dishes || []).reduce((s2, d) => s2 + (parseInt(d.fats) || 0), 0), 0);
                  const totalCarbs = dietPlan.meals.reduce((s, m) => s + (m.dishes || []).reduce((s2, d) => s2 + (parseInt(d.carbs) || 0), 0), 0);
                  return (
                    <>
                      <span className="font-semibold text-gray-800 dark:text-white">{totalCals} ккал</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-600 dark:text-gray-400">Б {totalProtein} г</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-600 dark:text-gray-400">Ж {totalFats} г</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-600 dark:text-gray-400">У {totalCarbs} г</span>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/dietitian/plan')}
              className="w-full py-8 rounded-[2rem] border-2 border-dashed border-green-300 dark:border-green-600/50 hover:border-green-500 dark:hover:border-green-500 bg-green-50/50 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                <Plus size={28} className="text-green-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Создать рацион на сегодня</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">Ixteria подберёт блюда под ваш КБЖУ</span>
            </button>
          )}
        </div>

        {/* ===== Анализ рациона за день ===== */}
        <div className="bg-white/95 dark:bg-surface-dark rounded-[3rem] p-6 mb-6 shadow-sm border border-gray-100 dark:border-transparent backdrop-blur-lg">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">📊 Анализ рациона за день</h2>
          {todayMeals.length === 0 && nutrition.calories.current === 0 ? (
            <div className="bg-gray-100/90 dark:bg-gray-700/50 rounded-[1.5rem] p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">Информации пока нет — добавьте приёмы пищи через чат, чтобы увидеть анализ рациона за сегодня.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-100/90 dark:bg-gray-700/50 rounded-[1.5rem] p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Сегодня вы употребили <span className="font-bold text-gray-800 dark:text-white">{nutrition.calories.current}</span> из <span className="font-bold text-gray-800 dark:text-white">{nutrition.calories.goal}</span> ккал.
                  {nutrition.calories.current < nutrition.calories.goal
                    ? ` Осталось ${nutrition.calories.goal - nutrition.calories.current} ккал.`
                    : nutrition.calories.current > nutrition.calories.goal
                      ? ` Перебор на ${nutrition.calories.current - nutrition.calories.goal} ккал.`
                      : ` Норма выполнена точно!`}
                </p>
              </div>
              <div className="bg-gray-100/90 dark:bg-gray-700/50 rounded-[1.5rem] p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Белки: <span className="font-bold text-gray-800 dark:text-white">{nutrition.protein.current}/{nutrition.protein.goal} г</span>
                  {nutrition.protein.current < nutrition.protein.goal ? ` (недобор ${nutrition.protein.goal - nutrition.protein.current} г)` : ` (норма)`}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-1">
                  Жиры: <span className="font-bold text-gray-800 dark:text-white">{nutrition.fats.current}/{nutrition.fats.goal} г</span>
                  {nutrition.fats.current < nutrition.fats.goal ? ` (недобор ${nutrition.fats.goal - nutrition.fats.current} г)` : ` (норма)`}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-1">
                  Углеводы: <span className="font-bold text-gray-800 dark:text-white">{nutrition.carbs.current}/{nutrition.carbs.goal} г</span>
                  {nutrition.carbs.current < nutrition.carbs.goal ? ` (недобор ${nutrition.carbs.goal - nutrition.carbs.current} г)` : ` (норма)`}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-1">
                  Вода: <span className="font-bold text-gray-800 dark:text-white">{nutrition.water.current}/{nutrition.water.goal} ст.</span>
                  {nutrition.water.current < nutrition.water.goal ? ` (недобор ${nutrition.water.goal - nutrition.water.current} ст.)` : ` (норма)`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showOnboarding && <OnboardingModal key={Date.now()} isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} onComplete={handleOnboardingComplete} editData={userProfile} />}
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} userProfile={userProfile} nutrition={nutrition} onDelete={handleDeleteProfile} />
      <ManualModal isOpen={showManual} onClose={() => setShowManual(false)} />
      <FoodDiaryModal isOpen={showDiary} onClose={() => setShowDiary(false)} nutritionGoal={nutrition.calories.goal} userId={userId} />
    </div>
    </>
  );
};

export default Dietitian;