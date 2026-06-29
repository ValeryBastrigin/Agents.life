import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Utensils, Flame, Beef, Droplets, Wheat, PieChart } from 'lucide-react';

const MEAL_EMOJI = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪',
  other: '🍽️'
};

const MEAL_LABEL = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
  other: 'Приём пищи'
};

const FoodLogWidget = ({ data }) => {
  const { items, totals, profile, today_totals } = data;

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: 0.2 + i * 0.1, duration: 0.3 }
    })
  };

  // Group items by meal type
  const byMeal = {};
  (items || []).forEach(item => {
    const mt = item.meal_type || 'other';
    if (!byMeal[mt]) byMeal[mt] = [];
    byMeal[mt].push(item);
  });

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-green-200/50 dark:border-green-700/30 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-3 mb-1">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200 }}
              className="p-2 rounded-[2rem] bg-gradient-to-br from-green-500 to-emerald-600"
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              Добавлено в дневник
            </span>
          </div>
        </div>

        {/* Meal Groups */}
        <div className="px-5 pb-4 space-y-3">
          {mealOrder.map(mealType => {
            const mealItems = byMeal[mealType];
            if (!mealItems) return null;
            return (
              <motion.div
                key={mealType}
                variants={itemVariants}
                custom={mealOrder.indexOf(mealType)}
                className="bg-white/60 dark:bg-white/5 rounded-[1.5rem] p-3 border border-white/50 dark:border-white/5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{MEAL_EMOJI[mealType] || '🍽️'}</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {MEAL_LABEL[mealType] || 'Приём пищи'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {mealItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800 dark:text-white truncate block">
                          {item.product}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.grams} г
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300 ml-3">
                        <span title="Калории" className="flex items-center gap-0.5 font-semibold text-orange-500 dark:text-orange-400">
                          <Flame className="w-3 h-3" />
                          {item.calories}
                        </span>
                        <span title="Белки" className="flex items-center gap-0.5">
                          <Beef className="w-3 h-3 text-red-400" />
                          {item.protein}
                        </span>
                        <span title="Жиры" className="flex items-center gap-0.5">
                          <Droplets className="w-3 h-3 text-yellow-500" />
                          {item.fats}
                        </span>
                        <span title="Углеводы" className="flex items-center gap-0.5">
                          <Wheat className="w-3 h-3 text-amber-600" />
                          {item.carbs}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          {/* Totals */}
          {totals && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-[1.5rem] p-3 border border-green-200/50 dark:border-green-700/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">
                  Итого за приём
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400">
                    <Flame className="w-3.5 h-3.5" />
                    {totals.calories} ккал
                  </span>
                  <span className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
                    <Beef className="w-3.5 h-3.5 text-red-400" />
                    Б: {totals.protein}г
                  </span>
                  <span className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
                    <Droplets className="w-3.5 h-3.5 text-yellow-500" />
                    Ж: {totals.fats}г
                  </span>
                  <span className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
                    <Wheat className="w-3.5 h-3.5 text-amber-600" />
                    У: {totals.carbs}г
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Today vs Profile Progress */}
          {today_totals && profile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="space-y-2"
            >
              {/* Calorie progress bar */}
              {profile.calorie_target && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Калории за сегодня</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {today_totals.calories} / {profile.calorie_target} ккал
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((today_totals.calories / profile.calorie_target) * 100, 100)}%` }}
                      transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        today_totals.calories > profile.calorie_target
                          ? 'bg-red-500'
                          : today_totals.calories > profile.calorie_target * 0.8
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                    />
                  </div>
                </div>
              )}
              {profile.protein_target && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Белки</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {today_totals.protein} / {profile.protein_target} г
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((today_totals.protein / profile.protein_target) * 100, 100)}%` }}
                      transition={{ delay: 0.9, duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-red-400 rounded-full"
                    />
                  </div>
                </div>
              )}
              {profile.fats_target && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Жиры</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {today_totals.fats} / {profile.fats_target} г
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((today_totals.fats / profile.fats_target) * 100, 100)}%` }}
                      transition={{ delay: 1.0, duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-yellow-400 rounded-full"
                    />
                  </div>
                </div>
              )}
              {profile.carbs_target && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Углеводы</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {today_totals.carbs} / {profile.carbs_target} г
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((today_totals.carbs / profile.carbs_target) * 100, 100)}%` }}
                      transition={{ delay: 1.1, duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default FoodLogWidget;