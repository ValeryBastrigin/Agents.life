import React, { useState, useEffect } from 'react';
import { CreditCard, Infinity, AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiClient } from '../utils/apiClient';

function getBarColor(usagePercent) {
  if (usagePercent >= 100) return 'bg-red-500';
  if (usagePercent >= 80) return 'bg-orange-500';
  if (usagePercent >= 50) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function getBarBgColor(usagePercent) {
  if (usagePercent >= 100) return 'bg-red-100 dark:bg-red-900/20';
  return 'bg-gray-100 dark:bg-gray-800';
}

const BillingPlans = ({ userProfile, onUpgrade }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userProfile?.id) {
      console.log('BillingPlans: No user profile ID yet, skipping fetch');
      return;
    }
    
    console.log('BillingPlans: Fetching billing data for user ID:', userProfile.id);
    
    Promise.all([
      apiClient.get('/api/billing/status', { params: { user_id: userProfile.id } }).then(r => {
        console.log('BillingPlans: Status response:', r.data);
        return r.data;
      }).catch(err => {
        console.error('BillingPlans: Status fetch error:', err);
        return null;
      }),
      apiClient.get('/api/billing/plans').then(r => {
        console.log('BillingPlans: Plans response:', r.data);
        return r.data;
      }).catch(err => {
        console.error('BillingPlans: Plans fetch error:', err);
        return [];
      }),
    ])
      .then(([statusData, plansData]) => {
        console.log('BillingPlans: Setting status and plans', { statusData, plansData });
        setStatus(statusData);
        setPlans(plansData);
      })
      .catch(err => {
        console.error('BillingPlans: Combined fetch error:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [userProfile?.id]);

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-6 mb-6 flex items-center justify-center gap-3 text-gray-500">
        <Loader2 size={20} className="animate-spin" />
        <span>{t('loading') || 'Загрузка...'}</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-6 mb-6">
        <p className="text-gray-500 text-center">{error || t('unavailable') || 'Недоступно'}</p>
      </div>
    );
  }

  const creditsTotal = status.credits_total ?? 0;
  const isInfinite = status.is_infinite ?? false;
  const currentPlanId = status.plan_id ?? 'free';
  const currentPlanName = status.plan_name ?? t('planFree') ?? 'Бесплатный';
  const creditsUsedToday = status.credits_used_today ?? 0;

  // Прогресс-бар: сколько израсходовано (от дневного лимита)
  const usedCredits = isInfinite ? 0 : Math.min(creditsUsedToday, creditsTotal);
  const creditsRemaining = isInfinite ? Infinity : Math.max(creditsTotal - creditsUsedToday, 0);
  const usagePercent = isInfinite ? 0 : (creditsTotal > 0 ? Math.min((usedCredits / creditsTotal) * 100, 100) : 0);

  return (
    <>
      {/* Current Plan — Usage Bar */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard size={24} className="text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            {t('myPlan') || 'Мой тариф'}
          </h3>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {currentPlanName}
            </span>
          </div>
          {isInfinite ? (
            <span className="flex items-center gap-1 text-sm font-medium text-purple-500">
              <Infinity size={16} />
              Безлимит
            </span>
          ) : (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {usedCredits.toLocaleString()} / {creditsTotal.toLocaleString()} {t('credits') || 'кредитов'}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {!isInfinite && (
          <div className={`w-full h-3 rounded-full ${getBarBgColor(usagePercent)} overflow-hidden`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(usagePercent)}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        )}

        {!isInfinite && creditsRemaining <= 0 && (
          <div className="mt-4 flex items-center gap-2 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-[2rem]">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="text-sm font-medium flex-1">{t('limitExceeded') || 'Кредиты закончились'}</span>
            <button
              onClick={() => onUpgrade && onUpgrade()}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-[2rem] transition-colors shrink-0"
            >
              {t('upgrade') || 'Пополнить'}
            </button>
          </div>
        )}
      </div>

      {/* All Plans Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {plans.map((plan) => {
          const isCurrent = plan.plan_id === currentPlanId;
          const isUnlimited = plan.is_infinite;

          return (
            <div
              key={plan.plan_id}
              className={`relative rounded-[2.5rem] p-5 transition-all duration-200 ${
                isCurrent
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                  : 'bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 hover:shadow-md'
              }`}
            >
              {/* Tag */}
              {isCurrent && (
                <span className="absolute -top-2 -right-2 bg-white text-blue-600 text-xs font-bold px-3 py-1 rounded-full shadow">
                  {t('active') || 'Активен'}
                </span>
              )}

              {/* Icon & Name */}
              <div className="flex items-center gap-2 mb-3">
                {isUnlimited ? (
                  <Infinity size={22} className={isCurrent ? 'text-white' : 'text-purple-500'} />
                ) : (
                  <CreditCard size={22} className={isCurrent ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
                )}
                <span className={`font-semibold text-base ${isCurrent ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
                  {plan.name}
                </span>
              </div>

              {/* Price */}
              <div className="mb-3">
                <span className={`text-2xl font-bold ${isCurrent ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
                  {plan.price_rub > 0 ? `${plan.price_rub} ₽` : '0 ₽'}
                </span>
                <span className={`text-xs ml-1 ${isCurrent ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                  / мес
                </span>
              </div>

              {/* Credits */}
              <div className={`text-sm mb-4 ${isCurrent ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {isUnlimited
                  ? 'Безлимитные кредиты'
                  : `${plan.credits.toLocaleString()} кредитов`}
              </div>

              {/* Features */}
              {plan.features && plan.features.length > 0 && (
                <div className={`text-xs mb-4 space-y-1 ${isCurrent ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                  {plan.features.slice(0, 4).map((f) => (
                    <div key={f}>✓ {f}</div>
                  ))}
                  {plan.features.length > 4 && <div>...</div>}
                </div>
              )}

              {/* Button */}
              {!isCurrent && (
                <button
                  onClick={() => onUpgrade && onUpgrade(plan.plan_id)}
                  className={`w-full py-2 rounded-[2rem] text-sm font-medium transition-colors ${
                    plan.recommended
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('select') || 'Выбрать'}
                </button>
              )}

              {isCurrent && (
                <div className="w-full py-2 rounded-[2rem] text-sm font-medium text-center text-white/80">
                  {t('currentPlan') || 'Текущий тариф'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default BillingPlans;