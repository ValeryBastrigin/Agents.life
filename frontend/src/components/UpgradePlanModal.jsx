import React, { useEffect } from 'react';
import { Crown, Infinity, X, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const UpgradePlanModal = ({ isOpen, onClose, onSelectPlan }) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      const scrollY = window.scrollY;
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'PRO',
      label: t('planPro'),
      price: '$10',
      period: t('perMonth'),
      subtitle: t('planExtended'),
      icon: Crown,
      popular: true,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'UNLIMITED',
      label: t('planUnlimited'),
      price: '$25',
      period: t('perMonth'),
      subtitle: t('planUnlimitedLabel'),
      icon: Infinity,
      popular: false,
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[3rem] p-8 shadow-2xl animate-bounce-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
            <Crown size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Выберите тариф
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Откройте больше возможностей с премиум-тарифом
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-[2rem] p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  plan.popular
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                }`}
                onClick={() => onSelectPlan(plan.id)}
              >
                {plan.popular && (
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                    {t('popular')}
                  </span>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={28} className="text-white/90" />
                    <div>
                      <div className="font-semibold text-base">{plan.label}</div>
                      <div className="text-sm text-white/70">
                        {plan.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{plan.price}</div>
                    <div className="text-xs text-white/70">{plan.period}</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-4 bg-white/20 rounded-[2rem] py-2 text-sm font-medium">
                  {t('selectPlan')}
                  <ArrowRight size={16} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          {t('paywallFooter')}
        </p>
      </div>
    </div>
  );
};

export default UpgradePlanModal;