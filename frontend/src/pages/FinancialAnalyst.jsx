import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Upload, Target, ArrowLeft } from 'lucide-react';

const FinancialAnalyst = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Проанализируйте свои расходы',
      description: 'Загрузите банковскую выписку, Ixteria разобьет траты и поступления на категории и произведет анализ.',
      icon: Upload,
      gradient: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/25',
    },
    {
      title: 'Сделайте анализ инвестиционного портфеля',
      description: 'Отправьте Ixteria скриншоты вашего портфеля и она подскажет вам как ребалансировать ваш портфель.',
      icon: TrendingUp,
      gradient: 'from-violet-500 to-pink-600',
      shadow: 'shadow-violet-500/25',
    },
    {
      title: 'Поставьте финансовую цель',
      description: 'Поставьте финансовую цель и добейтесь ее с помощью Ixteria',
      icon: Target,
      gradient: 'from-fuchsia-500 to-purple-600',
      shadow: 'shadow-fuchsia-500/25',
    },
  ];

  return (
    <div className="flex-1 relative overflow-y-auto min-h-screen">
      {/* Фиолетовый фон */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 dark:from-purple-950 dark:via-gray-900 dark:to-fuchsia-950" />
        {/* Декоративные круги */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-purple-200/30 dark:bg-purple-800/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-fuchsia-200/30 dark:bg-fuchsia-800/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-indigo-200/20 dark:bg-indigo-800/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto pt-8 pb-16 px-6">
        {/* Кнопка назад */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 px-4 py-2 rounded-[2rem] bg-white/70 dark:bg-gray-800/70 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Назад</span>
        </button>

        {/* Заголовок */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/30 mb-4">
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Финансовый анализ
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Выберите, что вы хотите проанализировать, и Ixteria поможет вам разобраться в ваших финансах
          </p>
        </div>

        {/* Карточки действий */}
        <div className="space-y-5">
          {cards.map((card, index) => (
            <button
              key={index}
              onClick={() => {
                // При нажатии отправляем пользователя в чат с соответствующим промптом
                const prompts = [
                  'Проанализируй мои расходы на основе банковской выписки',
                  'Проанализируй мой инвестиционный портфель и подскажи как ребалансировать',
                  'Помоги мне поставить финансовую цель и составить план для её достижения',
                ];
                // Сохраняем промпт в sessionStorage, чтобы Home компонент мог его подхватить
                sessionStorage.setItem('financialPrompt', prompts[index]);
                navigate('/chat');
              }}
              className={`w-full text-left bg-gradient-to-br ${card.gradient} rounded-[2.5rem] p-6 text-white shadow-lg ${card.shadow} hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group`}
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <card.icon size={26} className="text-white" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-lg font-bold mb-2 leading-snug">{card.title}</h3>
                  <p className="text-sm text-white/85 leading-relaxed">{card.description}</p>
                </div>
                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Нижняя подпись */}
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Ixteria — ваш персональный финансовый ассистент
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalyst;