import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChefHat, Sparkles, Loader2 } from 'lucide-react';
import { sendMessage } from '../utils/apiClient';
import DietitianBackground from '../components/DietitianBackground';
import FoodPreferencesModal from '../components/FoodPreferencesModal';

const DEMO_USER_ID = 1;

// ---------- Meal Plan Card ----------
const MealCard = ({ icon, title, dishes }) => (
  <div className="bg-white/95 dark:bg-surface-dark/95 backdrop-blur rounded-[2rem] p-5 shadow-sm border border-gray-100 dark:border-gray-800">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center text-lg">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-800 dark:text-white">{title}</h3>
    </div>
    {dishes && dishes.length > 0 ? (
      <div className="space-y-3">
        {dishes.map((dish, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-[1.5rem] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-white text-sm">{dish.name}</p>
                {dish.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{dish.description}</p>
                )}
              </div>
              {dish.calories && (
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-800 dark:text-white text-sm">{dish.calories}</p>
                  <p className="text-[10px] text-gray-400">ккал</p>
                </div>
              )}
            </div>
            {(dish.protein || dish.fats || dish.carbs) && (
              <div className="flex gap-2 mt-1.5">
                {dish.protein && <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">Б {dish.protein}г</span>}
                {dish.fats && <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">Ж {dish.fats}г</span>}
                {dish.carbs && <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">У {dish.carbs}г</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-400 text-center py-3">Не указано</p>
    )}
  </div>
);

const DietPlanPage = () => {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [mealPlan, setMealPlan] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [userPreferences, setUserPreferences] = useState('');

  const mealConfig = {
    breakfast: { icon: '🌅', title: 'Завтрак' },
    lunch: { icon: '☀️', title: 'Обед' },
    dinner: { icon: '🌙', title: 'Ужин' },
    snack: { icon: '🍪', title: 'Перекус' },
  };

  const handleGenerate = async (preferences) => {
    setGenerating(true);
    setShowPreferences(false);
    try {
      const prompt = `Составь персональный план питания на 1 день (завтрак, обед, ужин, перекус). 
Учти следующие пожелания пользователя: ${preferences}
Блюда должны быть разнообразными, вкусными и сбалансированными по КБЖУ.

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON (без markdown-разметки, без комментариев, только валидный JSON):
{
  "meals": [
    {
      "type": "breakfast",
      "dishes": [
        { "name": "Название блюда", "description": "Краткое описание", "calories": "ккал", "protein": "г", "fats": "г", "carbs": "г" }
      ]
    },
    {
      "type": "lunch",
      "dishes": [
        { "name": "Название блюда", "description": "Краткое описание", "calories": "ккал", "protein": "г", "fats": "г", "carbs": "г" }
      ]
    },
    {
      "type": "dinner",
      "dishes": [
        { "name": "Название блюда", "description": "Краткое описание", "calories": "ккал", "protein": "г", "fats": "г", "carbs": "г" }
      ]
    },
    {
      "type": "snack",
      "dishes": [
        { "name": "Название блюда", "description": "Краткое описание", "calories": "ккал", "protein": "г", "fats": "г", "carbs": "г" }
      ]
    }
  ]
}`;

      const response = await sendMessage({
        user_id: DEMO_USER_ID,
        message: prompt,
        agent: 'dietitian',
      });

      const text = response.response || '';
      // 1. Убираем markdown-блоки ```json ... ``` и ``` ... ```
      const cleanText = text
        .replace(/```(?:json)?\s*/gi, '')
        .replace(/\s*```/g, '')
        .trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Удаляем trailing commas перед ] и } (распространённая ошибка LLM)
        const cleaned = jsonMatch[0]
          .replace(/,\s*([\]}])/g, '$1');
        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          // Если всё равно не парсится — пробуем более агрессивную очистку
          const aggressive = cleaned
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '');
          parsed = JSON.parse(aggressive);
        }
        setMealPlan(parsed);
      } else {
        console.error('Failed to parse meal plan from LLM response');
        setMealPlan({ meals: [] });
      }
    } catch (e) {
      console.error('Failed to generate meal plan:', e);
      setMealPlan({ meals: [] });
    }
    setGenerating(false);
  };

  // ── Render meal plan if generated ──
  if (mealPlan && mealPlan.meals) {
    const totalCalories = mealPlan.meals.reduce((sum, meal) => {
      return sum + (meal.dishes || []).reduce((s, d) => s + (parseInt(d.calories) || 0), 0);
    }, 0);

    return (
      <div className="flex-1 overflow-y-auto animate-slide-in-left relative">
        <div className="absolute inset-0 pointer-events-none z-0">
          <DietitianBackground />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-6 pt-4 pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pt-2">
            <button
              onClick={() => { setMealPlan(null); }}
              className="p-2 hover:bg-white/30 dark:hover:bg-gray-800/30 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <img src="/assets/icons/agents/диетолог.svg" alt="Диетолог" className="w-10 h-10" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Диетолог</h2>
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

          {/* Meal cards */}
          <div className="space-y-4">
            {mealPlan.meals.map((meal, i) => {
              const config = mealConfig[meal.type] || { icon: '🍽️', title: meal.type };
              return (
                <MealCard
                  key={i}
                  icon={config.icon}
                  title={config.title}
                  dishes={meal.dishes}
                />
              );
            })}
          </div>

          {/* Generate again button */}
          <button
            onClick={() => setShowPreferences(true)}
            disabled={generating}
            className="w-full mt-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-[2rem] transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 flex items-center justify-center gap-2 text-lg disabled:opacity-70"
          >
            {generating ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles size={22} />
                Сгенерировать заново
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Главная страница: карточка-описание + теги + кнопка по центру ──
  return (
    <div className="flex-1 overflow-y-auto animate-slide-in-left relative">
      <div className="absolute inset-0 pointer-events-none z-0">
        <DietitianBackground />
      </div>
      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-4 pb-8">
        {/* Хедер */}
        <div className="flex items-center gap-3 mb-6 pt-2">
          <button
            onClick={() => navigate('/dietitian')}
            className="p-2 hover:bg-white/30 dark:hover:bg-gray-800/30 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
          <img src="/assets/icons/agents/диетолог.svg" alt="Диетолог" className="w-10 h-10" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Диетолог</h2>
        </div>

        {/* Карточка-описание + кнопка по центру */}
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <div className="bg-gradient-to-br from-green-50/90 via-emerald-50/90 to-white/90 dark:from-green-900/30 dark:via-emerald-900/25 dark:to-gray-800/30 backdrop-blur rounded-[2.5rem] p-10 max-w-md w-full shadow-lg border border-green-200/50 dark:border-green-700/30 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md shadow-green-500/30">
              <ChefHat size={40} className="text-white" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Персональный рацион</h2>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Сгенерируйте персональный рацион вместе с Ixteria. Она учтёт все ваши пожелания и параметры, и составит рацион, который вы сможете приготовить вместе!
            </p>

            {/* Теги */}
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
              onClick={() => setShowPreferences(true)}
              disabled={generating}
              className="w-full py-4 px-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-[2rem] transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 flex items-center justify-center gap-2 text-lg disabled:opacity-70"
            >
              {generating ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Sparkles size={22} />
                  Сгенерировать рацион
                </>
              )}
            </button>
          </div>
        </div>

        {/* Модалка с пожеланиями */}
        <FoodPreferencesModal
          isOpen={showPreferences}
          onClose={() => setShowPreferences(false)}
          onSubmit={handleGenerate}
          isLoading={generating}
        />
      </div>
    </div>
  );
};

export default DietPlanPage;