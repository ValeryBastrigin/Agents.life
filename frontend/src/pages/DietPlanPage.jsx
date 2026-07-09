import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChefHat, Ruler, Weight, Target, Activity, Sparkles, Settings } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import DietitianBackground from '../components/DietitianBackground';

const DEMO_USER_ID = 1;

const DietPlanPage = () => {
  const navigate = useNavigate();
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [nutrition, setNutrition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const saved = localStorage.getItem('dietitian_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          setProfile(parsed.profile);
          setNutrition(parsed.nutrition);
          setHasProfile(true);
          setLoading(false);
          return;
        }

        const { data } = await apiClient.get(`/api/user/${DEMO_USER_ID}/diet-profile`);
        if (data && data.height && data.weight) {
          const fetchedProfile = {
            height: data.height,
            weight: data.weight,
            age: data.age,
            gender: data.gender,
          };
          const fetchedNutrition = {
            calories: { goal: data.calorie_target },
            protein: { goal: data.protein_target },
            fats: { goal: data.fats_target },
            carbs: { goal: data.carbs_target },
            water: { goal: data.water_target },
          };
          setProfile(fetchedProfile);
          setNutrition(fetchedNutrition);
          setHasProfile(true);
        }
      } catch (e) {
        console.warn('Failed to load diet profile:', e);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 pointer-events-none z-0">
          <DietitianBackground />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-6 pt-4 pb-8 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  // ── Состояние: параметры НЕ заполнены ──
  if (!hasProfile) {
    return (
      <div className="flex-1 overflow-y-auto animate-slide-in-left relative">
        <div className="absolute inset-0 pointer-events-none z-0">
          <DietitianBackground />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-6 pt-4 pb-8">
          {/* ===== Хедер как у диетолога ===== */}
          <div className="flex items-center justify-between mb-6 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dietitian')}
                className="p-2 hover:bg-white/30 dark:hover:bg-gray-800/30 rounded-full transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
              <div className="w-10 h-10 rounded-full bg-green-100/80 dark:bg-green-900/30 flex items-center justify-center">
                <img src="/assets/icons/agents/диетолог.svg" alt="Диетолог" className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Диетолог</h2>
            </div>
          </div>

          {/* Decorative header */}
          <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-green-700 px-8 pt-10 pb-12 text-white relative overflow-hidden rounded-[3rem] mb-6">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-xl" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-5">
                <ChefHat size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Идеальный рацион для вас</h1>
              <p className="text-green-100 text-sm leading-relaxed max-w-sm">
                Здесь вы сможете создать персонализированный план питания, 
                который идеально подойдёт под ваши цели и образ жизни.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-8">
            <div className="bg-green-50/80 dark:bg-green-900/20 backdrop-blur rounded-[2rem] p-6 mb-6">
              <h2 className="font-semibold text-gray-800 dark:text-white text-lg mb-3 flex items-center gap-2">
                <Sparkles size={20} className="text-green-500" />
                Как это работает
              </h2>
              <ul className="space-y-3">
                {[
                  { icon: <Ruler size={18} />, text: 'Укажите ваш рост и вес' },
                  { icon: <Target size={18} />, text: 'Выберите цель: похудение, набор массы или поддержание' },
                  { icon: <Activity size={18} />, text: 'Расскажите об уровне двигательной активности' },
                  { icon: <Sparkles size={18} />, text: 'Получите готовый план питания с КБЖУ и рекомендациями' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 text-green-600 dark:text-green-400">
                      {item.icon}
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
              Для начала заполните информацию о себе — это займёт всего минуту.
            </p>

            <button
              onClick={() => navigate('/dietitian')}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-[2rem] transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Заполнить параметры
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Состояние: параметры ЗАПОЛНЕНЫ ──
  const goalLabels = { lose: 'Похудение', gain: 'Набор массы', maintain: 'Поддержание' };
  const activityLabels = {
    sedentary: 'Сидячий',
    light: 'Лёгкий',
    moderate: 'Умеренный',
    active: 'Активный',
    veryActive: 'Очень активный',
  };

  let savedGoal = 'maintain';
  let savedActivity = 'moderate';
  try {
    const saved = localStorage.getItem('dietitian_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      savedGoal = parsed.goal || savedGoal;
      savedActivity = parsed.activity || savedActivity;
    }
  } catch {}

  return (
    <div className="flex-1 overflow-y-auto animate-slide-in-left relative">
      <div className="absolute inset-0 pointer-events-none z-0">
        <DietitianBackground />
      </div>
      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-4 pb-8">
        {/* ===== Хедер как у диетолога ===== */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dietitian')}
              className="p-2 hover:bg-white/30 dark:hover:bg-gray-800/30 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <div className="w-10 h-10 rounded-full bg-green-100/80 dark:bg-green-900/30 flex items-center justify-center">
              <img src="/assets/icons/agents/диетолог.svg" alt="Диетолог" className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Диетолог</h2>
          </div>
        </div>

        {/* Parameters — без контейнера, прямо на странице */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Height */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur rounded-[1.5rem] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Ruler size={16} className="text-green-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Рост</span>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {profile?.height || '—'} <span className="text-sm font-normal text-gray-400">см</span>
            </p>
          </div>

          {/* Weight */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur rounded-[1.5rem] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Weight size={16} className="text-green-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Вес</span>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {profile?.weight || '—'} <span className="text-sm font-normal text-gray-400">кг</span>
            </p>
          </div>

          {/* Gender */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur rounded-[1.5rem] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">👤</span>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Пол</span>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white capitalize">
              {profile?.gender === 'male' ? 'Мужской' : profile?.gender === 'female' ? 'Женский' : profile?.gender || '—'}
            </p>
          </div>

          {/* Age */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur rounded-[1.5rem] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🎂</span>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Возраст</span>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {profile?.age || '—'} <span className="text-sm font-normal text-gray-400">лет</span>
            </p>
          </div>

          {/* Goal */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur rounded-[1.5rem] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target size={16} className="text-green-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Цель</span>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {goalLabels[savedGoal] || '—'}
            </p>
          </div>

          {/* Activity */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur rounded-[1.5rem] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-green-500" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Активность</span>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {activityLabels[savedActivity] || '—'}
            </p>
          </div>
        </div>

        {/* Nutrition summary */}
        {nutrition && (
          <div className="bg-green-50/80 dark:bg-green-900/20 backdrop-blur rounded-[2rem] p-6 mb-8">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4 text-center">
              Ваша дневная норма
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {nutrition.calories?.goal || '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">ккал</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {nutrition.protein?.goal || '—'} <span className="text-sm font-normal text-gray-400">г</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Белки</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {nutrition.fats?.goal || '—'} <span className="text-sm font-normal text-gray-400">г</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Жиры</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {nutrition.carbs?.goal || '—'} <span className="text-sm font-normal text-gray-400">г</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Углеводы</p>
              </div>
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={() => {
            navigate('/dietitian');
          }}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-[2rem] transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 flex items-center justify-center gap-2 text-lg"
        >
          <Sparkles size={22} />
          Сгенерировать рацион
        </button>
      </div>
    </div>
  );
};

export default DietPlanPage;