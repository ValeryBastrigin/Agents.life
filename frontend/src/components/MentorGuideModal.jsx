import React from 'react';
import { Wand2, MessageSquare, BookOpen, GitBranch, Zap, X } from 'lucide-react';

const guideSteps = [
  {
    icon: <Wand2 size={24} />,
    title: 'Расскажите о своей мечте',
    description: 'Поделитесь с ментором своей мечтой или целью, и он разложит понятный пошаговый путь к её достижению. Ментор проанализирует вашу ситуацию, разобьёт большую цель на реалистичные шаги и будет сопровождать вас на всём пути.',
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200/40 dark:border-amber-700/25',
  },
  {
    icon: <MessageSquare size={24} />,
    title: 'Обсуждайте активные шаги в чате',
    description: 'В любой момент вы можете открыть чат с ментором и обсудить текущие шаги, задать вопросы, получить совет или уточнить детали. Ментор всегда на связи и готов помочь скорректировать план.',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200/40 dark:border-purple-700/25',
  },
  {
    icon: <BookOpen size={24} />,
    title: 'Получайте рекомендованные материалы',
    description: 'Ментор подбирает для вас релевантные книги, курсы, статьи, видео и практические задания на основе ваших целей. Это помогает ускорить развитие и получить глубокие знания по теме.',
    color: 'from-indigo-400 to-purple-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200/40 dark:border-indigo-700/25',
  },
  {
    icon: <GitBranch size={24} />,
    title: 'Наблюдайте прогресс в дереве развития',
    description: 'Визуальное дерево развития показывает, как далеко вы продвинулись на пути к мечте. Каждый выполненный шаг — новая ветвь на вашем дереве. Это помогает видеть общую картину и мотивирует двигаться дальше.',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200/40 dark:border-green-700/25',
  },
  {
    icon: <Zap size={24} />,
    title: 'Отслеживайте привычки',
    description: 'Вместе с ментором вы можете отказаться от вредных привычек и привить полезные. Трекер привычек помогает ежедневно отмечать прогресс, накапливать опыт (XP) и повышать уровень. Маленькие шаги каждый день ведут к большим изменениям!',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200/40 dark:border-amber-700/25',
  },
];

const MentorGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="bg-white/95 dark:bg-surface-dark backdrop-blur-lg rounded-[3rem] max-w-lg w-full shadow-2xl border border-gray-200 dark:border-transparent max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-surface-dark backdrop-blur-lg rounded-t-[3rem] border-b border-gray-100 dark:border-gray-700/50 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                <Wand2 size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Как пользоваться ментором?
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-all text-gray-500 dark:text-gray-300 shrink-0"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-[52px] leading-relaxed">
            Ментор — ваш персональный наставник, который поможет превратить мечты в реальность. Вот как с ним работать:
          </p>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-4">
          {guideSteps.map((step, idx) => (
            <div
              key={idx}
              className={`${step.bgColor} ${step.borderColor} border rounded-[2rem] p-5 transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shrink-0 shadow-md`}>
                  <div className="text-white">
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 shrink-0">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15 rounded-[2rem] p-4 border border-amber-200/40 dark:border-amber-700/25">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center leading-relaxed">
              ✨ <strong className="text-amber-600 dark:text-amber-400">Совет:</strong> Начните с рассказа о своей мечте — нажмите на кнопку «На пути к мечте» и опишите, чего хотите достичь. Ментор сам разложит всё по шагам!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorGuideModal;