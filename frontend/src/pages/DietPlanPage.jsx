import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ChefHat, Sparkles, Loader2, Trash2, X, UserCircle, Settings } from 'lucide-react';
import { getDietPlan, saveDietPlan, createChat, deleteDietPlan } from '../utils/apiClient';
import DietitianBackground from '../components/DietitianBackground';
import MealPlanRequestModal from '../components/MealPlanRequestModal';
import MealPlanWidget from '../components/ui/widgets/MealPlanWidget';
import { useUser } from '../contexts/UserContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

// ---------- Profile Setup Card ----------
const ProfileSetupCard = ({ profile, onContinue, onConfigure, onSkip }) => {
  const hasEssentialData = profile && profile.height && profile.weight && profile.age && profile.gender && profile.goal;

  return (
    <div className="bg-gradient-to-br from-green-50/90 via-emerald-50/90 to-white/90 dark:from-green-900/30 dark:via-emerald-900/25 dark:to-gray-800/30 backdrop-blur rounded-[2.5rem] p-8 max-w-md w-full shadow-lg border border-green-200/50 dark:border-green-700/30">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
          <UserCircle size={32} className="text-white" />
        </div>
        
        {hasEssentialData ? (
          <>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Профиль уже настроен!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Ваш персональный профиль готов:<br />
              Рост: {profile.height} см · Вес: {profile.weight} кг · Возраст: {profile.age} лет<br />
              Цель: {profile.goal === 'lose' ? 'похудение' : profile.goal === 'gain' ? 'набор массы' : 'поддержание веса'}
            </p>
            {profile.calorie_target && (
              <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                🎯 Ваша норма: {profile.calorie_target} ккал/день
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Диетолог учтёт все ваши данные при составлении рациона.
            </p>
            <button
              onClick={onContinue}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-[2rem] transition-all duration-300 shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 mb-3"
            >
              <Sparkles size={20} />
              Сгенерировать рацион
            </button>
            <button
              onClick={onConfigure}
              className="w-full py-2 px-4 bg-white/50 dark:bg-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/80 text-gray-600 dark:text-gray-300 font-medium rounded-[2rem] transition-all duration-300 flex items-center justify-center gap-2 text-sm"
            >
              <Settings size={16} />
              Изменить параметры
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Нужно заполнить профиль</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
              Для составления персонального рациона нам нужны ваши параметры.
            </p>
            <div className="bg-white/50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 w-full text-left text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>• Рост и вес — для расчёта КБЖУ</p>
              <p>• Возраст и пол — для точности формулы</p>
              <p>• Цель — похудение, набор массы или поддержание</p>
              <p>• Уровень активности — для учёта расхода калорий</p>
            </div>
            <button
              onClick={onConfigure}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-[2rem] transition-all duration-300 shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 mb-3"
            >
              <Settings size={20} />
              Настроить профиль
            </button>
            <button
              onClick={onSkip}
              className="w-full py-2 px-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors"
            >
              Пропустить (без персональных данных)
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Main Component ----------
const DietPlanPage = () => {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState(null);
  const [exiting, setExiting] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [showMealRequestModal, setShowMealRequestModal] = useState(false);
  const [foodSubmitting, setFoodSubmitting] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [generationStep, setGenerationStep] = useState('idle'); // idle, checking_profile, showing_modal, creating_chat, generating, done
  const [generationError, setGenerationError] = useState(null);
  const [cookingMealIndex, setCookingMealIndex] = useState(null);

  const handleBack = () => {
    navigate('/dietitian');
  };

  // Load diet profile on mount using the same endpoint that Dietitian.jsx uses
  useEffect(() => {
    (async () => {
      try {
        const response = await axios.get(`${API_URL}/api/user/${userId}/diet-profile`);
        if (response.data) {
          setUserProfile(response.data);
          // Check if essential fields are filled
          const complete = response.data.height && response.data.weight && response.data.age && response.data.gender && response.data.goal;
          setIsProfileComplete(complete);
        }
      } catch (e) {
        console.warn('Failed to load user profile (will check localStorage):', e);
        
        // Fallback: check localStorage for profile data
        try {
          const stored = localStorage.getItem('dietitian_profile');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.profile) {
              setUserProfile(parsed.profile);
              const complete = parsed.profile.height && parsed.profile.weight && parsed.profile.age && parsed.profile.gender && parsed.goal;
              setIsProfileComplete(complete);
            }
          }
        } catch (e2) {
          console.warn('Failed to load profile from localStorage:', e2);
        }
      } finally {
        setCheckingProfile(false);
      }
    })();
  }, []);

  // Load saved meal plan
  useEffect(() => {
    (async () => {
      try {
        const data = await getDietPlan(userId);
        if (data.plan_data) {
          const parsed = JSON.parse(data.plan_data);
          if (parsed && parsed.meals) {
            setMealPlan(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to load saved meal plan:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mealConfig = {
    breakfast: { icon: '🌅', title: 'Завтрак' },
    lunch: { icon: '☀️', title: 'Обед' },
    dinner: { icon: '🌙', title: 'Ужин' },
    snack: { icon: '🍪', title: 'Перекус' },
  };

  const handleDeletePlan = async () => {
    setDeleting(true);
    try {
      await deleteDietPlan(userId);
      setMealPlan(null);
      setShowDeleteConfirm(false);
    } catch (e) {
      console.error('Failed to delete diet plan:', e);
      alert('Не удалось удалить рацион. Попробуйте ещё раз.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Handle meal plan request from modal ──
  const handleMealPlanRequest = async (preferencesText) => {
    setFoodSubmitting(true);
    setShowMealRequestModal(false);
    try {
      await startDietitianChatWithPreferences(preferencesText, false);
    } catch (e) {
      console.error('Failed to handle meal plan request:', e);
      setFoodSubmitting(false);
    }
  };

  // ── Handle regenerate meal plan (stay on page, don't redirect to chat) ──
  const handleRegeneratePlan = async (preferencesText) => {
    setFoodSubmitting(true);
    setShowMealRequestModal(false);
    try {
      await startDietitianChatWithPreferences(preferencesText, true);
    } catch (e) {
      console.error('Failed to regenerate meal plan:', e);
      setFoodSubmitting(false);
    }
  };

  // ── Start dietitian chat with meal plan generation context ──
  const startDietitianChatWithPreferences = async (preferencesText = null, stayOnPage = false) => {
    setCreatingChat(true);
    setGenerationError(null);
    try {
      const prefs = preferencesText;
      
      // Build the message text with profile context and preferences
      let messageText = 'Составь мне персональный рацион питания на один день.';
      
      if (userProfile) {
        const profileInfo = [];
        if (userProfile.height) profileInfo.push(`рост ${userProfile.height} см`);
        if (userProfile.weight) profileInfo.push(`вес ${userProfile.weight} кг`);
        if (userProfile.age) profileInfo.push(`возраст ${userProfile.age} лет`);
        if (userProfile.goal) {
          const goalMap = { 'lose': 'похудение', 'gain': 'набор массы', 'maintain': 'поддержание веса' };
          profileInfo.push(`цель: ${goalMap[userProfile.goal] || userProfile.goal}`);
        }
        if (userProfile.calorie_target) profileInfo.push(`калорийность ~${userProfile.calorie_target} ккал/день`);
        if (userProfile.activity_level) {
          const actMap = { 'sedentary': 'сидячий', 'light': 'лёгкая активность', 'moderate': 'умеренная активность', 'active': 'высокая активность' };
          profileInfo.push(`активность: ${actMap[userProfile.activity_level] || userProfile.activity_level}`);
        }
        messageText = `Составь мне персональный рацион питания на один день. Мои параметры: ${profileInfo.join(', ')}.`;
      }
      
      if (prefs) {
        messageText += ` Мои предпочтения: ${prefs}`;
      }

      // Call the streaming chat endpoint with generate_meal_plan=true
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          agent: 'dietitian',
          message: messageText,
          generate_meal_plan: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      // Read the SSE stream — wait for the COMPLETE response before redirecting
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chatId = null;
      let fullContent = '';
      let receivedDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            
            // Save chat_id as soon as it's available
            if (data.chat_id && !chatId) {
              chatId = data.chat_id;
            }
            
            if (data.type === 'token' && data.content) {
              fullContent += data.content;
            }
            if (data.type === 'done') {
              receivedDone = true;
              if (data.chat_id) chatId = data.chat_id;
            }
            if (data.type === 'widget') {
              fullContent = data.content;
              if (data.chat_id) chatId = data.chat_id;
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', e);
          }
        }
      }

      if (!chatId) {
        throw new Error('Failed to get chat_id from stream');
      }

      if (stayOnPage) {
        // Reload the meal plan from the server
        try {
          const data = await getDietPlan(userId);
          if (data.plan_data) {
            const parsed = JSON.parse(data.plan_data);
            if (parsed && parsed.meals) {
              setMealPlan(parsed);
            }
          }
        } catch (e) {
          console.warn('Failed to reload meal plan after regeneration:', e);
        }
        setFoodSubmitting(false);
        setCreatingChat(false);
      } else {
        // Redirect to chat ONLY after the full response has been received and saved
        navigate(`/chat/${chatId}`);
      }
      
    } catch (e) {
      console.error('Failed to create dietitian chat with meal plan:', e);
      setGenerationError(e.message || 'Не удалось создать чат с диетологом');
      setCreatingChat(false);
    }
  };

  // ── Handle "Приготовить с ixteria" button — creates chat, waits for full response, then redirects ──
  const handleCookMeal = async (meal, mealIndex) => {
    if (!meal || !meal.dishes || !meal.dishes.length) return;
    
    setCookingMealIndex(mealIndex);
    
    const dishNames = meal.dishes.map(d => d.name).join(', ');
    const messageText = `Давай приготовим ${dishNames} пошагово вместе!`;
    
    try {
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          agent: 'dietitian',
          message: messageText,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let chatId = null;
      let fullContent = '';

      // Read the stream completely — wait for the full AI response before redirecting
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chat_id && !chatId) {
              chatId = data.chat_id;
            }
            if (data.type === 'token' && data.content) {
              fullContent += data.content;
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', e);
          }
        }
      }

      setCookingMealIndex(null);

      if (chatId) {
        navigate(`/chat/${chatId}`);
      } else {
        throw new Error('Failed to get chat_id from stream');
      }
    } catch (e) {
      console.error('Failed to create cooking chat:', e);
      setCookingMealIndex(null);
    }
  };

  // ── Handler for "Сгенерировать рацион" button ──
  const handleStartGeneration = async () => {
    if (!isProfileComplete) {
      // Profile not complete — redirect to Dietitian page for onboarding
      navigate('/dietitian');
      return;
    }

    // Profile is complete — open modal to ask for preferences
    setShowMealRequestModal(true);
  };

  // ── Loading state while checking profile ──
  if (checkingProfile || loading) {
    return (
      <div className="flex-1 flex items-center justify-center relative">
        <div className="absolute inset-0 pointer-events-none z-0">
          <DietitianBackground />
        </div>
        <div className="relative z-10 flex items-center gap-3 text-gray-500">
          <Loader2 size={24} className="animate-spin" />
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  // ── Render meal plan if generated ──
  if (mealPlan && mealPlan.meals) {
    const totalCalories = mealPlan.meals.reduce((sum, meal) => {
      return sum + (meal.dishes || []).reduce((s, d) => s + (parseInt(d.calories) || 0), 0);
    }, 0);

    return (
      <div className={`flex-1 overflow-y-auto animate-slide-in-left relative`}>
        <div className="absolute inset-0 pointer-events-none z-0">
          <DietitianBackground />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-6 pt-4 pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pt-2">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white/30 dark:hover:bg-gray-800/30 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <img src="/assets/icons/agents/диетолог.svg" alt="Диетолог" className="w-10 h-10" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Диетолог</h2>
            <div className="flex-1" />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors group"
              title="Удалить рацион"
            >
              <Trash2 size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>

          {/* Success banner */}
          <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-green-700 px-6 py-6 text-white relative overflow-hidden rounded-[2.5rem] mb-6">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={24} className="text-green-200" />
                <h1 className="text-xl font-bold">Ваш персональный рацион готов!</h1>
              </div>
              <p className="text-green-100 text-sm">
                Общая калорийность: <span className="font-bold text-white">{totalCalories} ккал</span>
              </p>
            </div>
          </div>

          {/* Meal Plan Widget instead of manual cards */}
          <div className="mb-6">
            <MealPlanWidget data={mealPlan} onCookMeal={handleCookMeal} />
          </div>

          {/* Meal Plan Request Modal for regeneration */}
          <MealPlanRequestModal
            isOpen={showMealRequestModal}
            onClose={() => setShowMealRequestModal(false)}
            onSubmit={handleRegeneratePlan}
            isLoading={foodSubmitting}
          />

          {/* Generate again button — opens modal and regenerates on the same page */}
          <button
            onClick={() => setShowMealRequestModal(true)}
            disabled={creatingChat || generating}
            className="w-full mt-4 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-[2rem] transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 flex items-center justify-center gap-2 text-lg disabled:opacity-70"
          >
            {(creatingChat || generating) ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Генерируем рацион...
              </>
            ) : (
              <>
                <Sparkles size={22} />
                Сгенерировать заново
              </>
            )}
          </button>
          
          {generationError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl text-red-600 dark:text-red-400 text-sm text-center">
              {generationError}
            </div>
          )}
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteConfirm(false)}>
            <div
              className="w-full max-w-sm bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-red-500 to-rose-600 p-5 text-white shrink-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold truncate">Удалить рацион?</h2>
                    <p className="text-white/80 text-sm truncate">Это действие нельзя отменить</p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0 ml-2"
                  >
                    <X size={18} className="text-white" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
                  Рацион и все связанные с ним данные будут безвозвратно удалены из базы данных.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 px-4 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-medium rounded-[2rem] transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleDeletePlan}
                    disabled={deleting}
                    className="flex-1 py-3 px-4 bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-60 text-white font-medium rounded-[2rem] transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    {deleting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Удаление...
                      </>
                    ) : (
                      'Удалить'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Full-screen loader overlay for "Приготовить с ixteria" */}
        {cookingMealIndex !== null && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-xl shadow-green-500/30 animate-pulse">
                <ChefHat size={32} className="text-white" />
              </div>
              <Loader2 size={28} className="animate-spin text-white" />
              <p className="text-white/90 text-lg font-medium">Создаём чат с Ixteria...</p>
              <p className="text-white/50 text-sm">Готовим пошаговый рецепт</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main page: intro card + generate button ──
  return (
    <div className="flex-1 overflow-y-auto animate-slide-in-left relative">
      <div className="absolute inset-0 pointer-events-none z-0">
        <DietitianBackground />
      </div>
      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-2">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/30 dark:hover:bg-gray-800/30 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <img src="/assets/icons/agents/диетолог.svg" alt="Диетолог" className="w-10 h-10" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Диетолог</h2>
        </div>

        {/* Center content */}
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          {/* If profile exists but is incomplete, show ProfileSetupCard */}
          {!isProfileComplete ? (
            <ProfileSetupCard
              profile={userProfile}
              onContinue={() => startDietitianChatWithPreferences()}
              onConfigure={() => navigate('/dietitian')}
              onSkip={() => startDietitianChatWithPreferences()}
            />
          ) : (
            <div className="bg-gradient-to-br from-green-50/90 via-emerald-50/90 to-white/90 dark:from-green-900/30 dark:via-emerald-900/25 dark:to-gray-800/30 backdrop-blur rounded-[2.5rem] p-10 max-w-md w-full shadow-lg border border-green-200/50 dark:border-green-700/30 text-center">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md shadow-green-500/30">
                <ChefHat size={40} className="text-white" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Персональный рацион</h2>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Сгенерируйте персональный рацион вместе с Ixteria. Она учтёт все ваши пожелания и параметры, и составит рацион, который вы сможете приготовить вместе!
              </p>

              {/* Tags */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <span className="px-4 py-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-medium rounded-full shadow-sm">
                  🥗 Рецепты
                </span>
                <span className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full shadow-sm">
                  📊 КБЖУ
                </span>
                <span className="px-4 py-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-medium rounded-full shadow-sm">
                  🎯 Цели
                </span>
              </div>
              
              <button
                onClick={handleStartGeneration}
                disabled={creatingChat || generating}
                className="w-full py-4 px-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-[2rem] transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 flex items-center justify-center gap-2 text-lg disabled:opacity-70"
              >
                {(creatingChat || generating) ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    Генерируем рацион...
                  </>
                ) : (
                  <>
                    <Sparkles size={22} />
                    Сгенерировать рацион
                  </>
                )}
              </button>
              
              {generationError && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-2xl text-red-600 dark:text-red-400 text-sm text-center">
                  {generationError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meal Plan Request Modal */}
      <MealPlanRequestModal
        isOpen={showMealRequestModal}
        onClose={() => setShowMealRequestModal(false)}
        onSubmit={mealPlan ? handleRegeneratePlan : handleMealPlanRequest}
        isLoading={foodSubmitting}
      />
    </div>
  );
};

export default DietPlanPage;