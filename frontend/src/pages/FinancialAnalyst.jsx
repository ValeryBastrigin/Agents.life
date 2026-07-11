import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowLeft, ArrowRight } from 'lucide-react';
import bankcardIcon from './bankcard.svg';
import portfelIcon from './portfel.svg';
import StatementAnalysisModal from '../components/StatementAnalysisModal';

const FinancialAnalyst = () => {
  const navigate = useNavigate();
  const [showAnalysis, setShowAnalysis] = useState(false);

  const cards = [
    {
      title: 'Проанализируйте свои расходы',
      description: 'Загрузите банковскую выписку, Ixteria разобьет траты и поступления на категории и произведет анализ.',
      gradient: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/25',
      action: 'modal',
    },
    {
      title: 'Сделайте анализ инвестиционного портфеля',
      description: 'Отправьте Ixteria скриншоты вашего портфеля и она подскажет вам как ребалансировать ваш портфель.',
      gradient: 'from-violet-500 to-pink-600',
      shadow: 'shadow-violet-500/25',
      action: 'chat',
    },
    {
      title: 'Поставьте финансовую цель',
      description: 'Поставьте финансовую цель и добейтесь ее с помощью Ixteria',
      gradient: 'from-fuchsia-500 to-purple-600',
      shadow: 'shadow-fuchsia-500/25',
      action: 'chat',
    },
  ];

  const cardIcons = [
    bankcardIcon,
    portfelIcon,
    '/assets/icons/agents/ментор.svg',
  ];

  const prompts = [
    'Проанализируй мои расходы на основе банковской выписки',
    'Проанализируй мой инвестиционный портфель и подскажи как ребалансировать',
    'Помоги мне поставить финансовую цель и составить план для её достижения',
  ];

  const handleCardClick = (index) => {
    if (cards[index].action === 'modal') {
      setShowAnalysis(true);
    } else {
      sessionStorage.setItem('financialPrompt', prompts[index]);
      navigate('/chat');
    }
  };

  return (
    <div className="flex-1 relative overflow-y-auto min-h-screen">
      {/* Фиолетовый фон */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 dark:from-purple-950 dark:via-gray-900 dark:to-fuchsia-950" />
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-purple-200/30 dark:bg-purple-800/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-fuchsia-200/30 dark:bg-fuchsia-800/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-indigo-200/20 dark:bg-indigo-800/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto pt-6 pb-16 px-6">
        {/* Кнопка назад */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 px-5 py-2.5 rounded-[2rem] bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Назад</span>
        </button>

        {/* Заголовок */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/30 mb-5">
            <TrendingUp size={32} className="text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-3">
            Финансовый анализ
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Выберите, что вы хотите проанализировать, и Ixteria поможет вам разобраться в ваших финансах
          </p>
        </div>

        {/* Карточки действий */}
        <div className="space-y-5">
          {cards.map((card, index) => (
            <button
              key={index}
              onClick={() => handleCardClick(index)}
              className={`w-full text-left bg-gradient-to-br ${card.gradient} rounded-[2.5rem] p-5 md:p-7 text-white shadow-lg ${card.shadow} hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group`}
            >
              <div className="flex items-center gap-4 md:gap-6 w-full">
                <img 
                  src={cardIcons[index]} 
                  alt="" 
                  className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg animate-bounce-soft" 
                />
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="text-base md:text-lg font-bold mb-1.5 md:mb-2 leading-snug">{card.title}</h3>
                  <p className="text-xs md:text-sm text-white/85 leading-relaxed">{card.description}</p>
                </div>
                <div className="flex-shrink-0 self-center">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <ArrowRight size={18} className="text-white/70 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Нижняя подпись */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Ixteria — ваш персональный финансовый ассистент
          </p>
        </div>
      </div>

      {/* Модалка анализа выписок — для первой карточки */}
      <StatementAnalysisModal
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        onStatementSaved={() => {
          // Можно обновить список выписок если нужно
        }}
      />
    </div>
  );
};

export default FinancialAnalyst;