import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChefHat, Loader2 } from 'lucide-react';

const MEAL_EMOJIS = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪',
  other: '🍽️',
};

const MEAL_LABELS = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
  other: 'Приём пищи',
};

const MealPlanWidget = ({ data, inChat = false, onCookMeal }) => {
  const navigate = useNavigate();
  const meals = data?.meals || [];
  if (!meals.length) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-[2.5rem] p-5 border border-orange-200 dark:border-orange-700/30 shadow-sm">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Не удалось загрузить план питания
        </div>
      </div>
    );
  }

  // Calculate totals
  let totalCalories = 0;
  let totalProtein = 0;
  let totalFats = 0;
  let totalCarbs = 0;
  let totalDishes = 0;

  meals.forEach((meal) => {
    (meal.dishes || []).forEach((dish) => {
      totalCalories += parseInt(dish.calories) || 0;
      totalProtein += parseInt(dish.protein) || 0;
      totalFats += parseInt(dish.fats) || 0;
      totalCarbs += parseInt(dish.carbs) || 0;
      totalDishes++;
    });
  });

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-[2.5rem] p-5 border border-orange-200 dark:border-orange-700/30 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-lg shadow-md">
          🥗
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
            План питания на день
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {totalDishes} блюд · {totalCalories} ккал
          </p>
        </div>
        {inChat && (
          <button
            onClick={() => navigate('/dietitian/plan')}
            className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors flex-shrink-0"
            title="Перейти к плану питания"
          >
            <ChevronRight className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </button>
        )}
      </div>

      {/* Meals */}
      <div className="space-y-3">
        {meals.map((meal, mealIdx) => (
          <div key={mealIdx} className="bg-white/70 dark:bg-gray-800/50 rounded-[2rem] p-3 border border-orange-100 dark:border-orange-700/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{MEAL_EMOJIS[meal.type] || '🍽️'}</span>
              <span className="font-medium text-gray-700 dark:text-gray-200 text-sm flex-1">
                {MEAL_LABELS[meal.type] || meal.type}
              </span>
              {!inChat && onCookMeal && (
                <button
                  onClick={() => onCookMeal(meal, mealIdx)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm shadow-green-500/20 hover:shadow-md transition-all active:scale-[0.97]"
                >
                  <ChefHat size={14} />
                  Приготовить с ixteria
                </button>
              )}
            </div>

            <div className="space-y-2">
              {(meal.dishes || []).map((dish, dishIdx) => (
                <div
                  key={dishIdx}
                  className="flex justify-between items-start py-1.5 px-2 rounded-[1.5rem] hover:bg-orange-50/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {dish.name}
                    </p>
                    {dish.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {dish.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {dish.calories} ккал
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Б:{dish.protein} Ж:{dish.fats} У:{dish.carbs}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-4 pt-3 border-t border-orange-200 dark:border-orange-700/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Итого за день</span>
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
            {totalCalories} ккал
          </span>
        </div>
        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>Белки: {totalProtein}г</span>
          <span>Жиры: {totalFats}г</span>
          <span>Углеводы: {totalCarbs}г</span>
        </div>
      </div>
    </div>
  );
};

export default MealPlanWidget;