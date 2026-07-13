import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChefHat, Sparkles } from 'lucide-react';

const GoToMealPlanWidget = ({ data }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-[2.5rem] p-5 border border-green-200 dark:border-green-700/30 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xl shadow-md">
          <ChefHat size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base">
            План питания
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Индивидуальный рацион под ваши параметры
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        {data?.text || 'Для формирования плана питания перейдите в раздел плана, и я сформирую вам индивидуальное питание с учётом ваших параметров и целей.'}
      </p>

      <button
        onClick={() => navigate('/dietitian/plan')}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-[2rem] transition-all shadow-md shadow-green-500/20 hover:shadow-lg active:scale-[0.98]"
      >
        <Sparkles size={18} />
        <span>Перейти в раздел плана питания</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default GoToMealPlanWidget;