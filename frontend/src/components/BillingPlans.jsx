import React, { useState, useEffect } from 'react';
import { CreditCard, Infinity, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiClient } from '../utils/apiClient';

const BillingPlans = ({ userProfile, onUpgrade, onPaywall }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userProfile?.id) return;

    apiClient.get('/api/billing/status', { params: { user_id: userProfile.id } })
      .then(r => setStatus(r.data))
      .catch(err => setError(err.message))
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
  const currentPlanName = status.plan_name ?? 'Бесплатный';
  const creditsUsedToday = status.credits_used_today ?? 0;

  const usedCredits = isInfinite ? 0 : Math.min(creditsUsedToday, creditsTotal);
  const creditsRemaining = isInfinite ? Infinity : Math.max(creditsTotal - creditsUsedToday, 0);
  const usagePercent = isInfinite ? 0 : (creditsTotal > 0 ? Math.min((usedCredits / creditsTotal) * 100, 100) : 0);

  const isProOrUnlimited = status.plan_id === 'pro' || status.plan_id === 'unlimited';

  // Цвет полоски прогресса в зависимости от процента использования
  const getBarColor = (pct) => {
    if (pct >= 85) return 'bg-red-400';
    if (pct >= 60) return 'bg-orange-400';
    if (pct >= 35) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  // Цвет фона трека тоже меняем для наглядности
  const getTrackBg = (pct) => {
    if (pct >= 85) return 'bg-red-500/40';
    if (pct >= 60) return 'bg-orange-500/30';
    return 'bg-white/30';
  };

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-[3.5rem] p-6 mb-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard size={24} className="text-white/80" />
        <h3 className="text-lg font-semibold">
          {t('myPlan') || 'Мой тариф'}
        </h3>
      </div>

      <div className="flex items-center justify-between mb-1">
        <span className="text-white/90 font-medium">
          {currentPlanName}
        </span>
        {isInfinite && (
          <span className="flex items-center gap-1 text-sm font-medium text-amber-300">
            <Infinity size={16} />
            Безлимит
          </span>
        )}
      </div>

      {!isInfinite && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Дневной лимит</span>
            <span className={`text-sm font-medium ${
              usagePercent >= 85 ? 'text-red-300' :
              usagePercent >= 60 ? 'text-orange-300' :
              'text-white/80'
            }`}>
              {usedCredits} / {creditsTotal}
            </span>
          </div>

          {/* Progress Bar — краснеет по мере истраты */}
          <div className={`w-full h-3 rounded-full ${getTrackBg(usagePercent)} overflow-hidden transition-colors duration-500`}>
            <div
              className={`h-full rounded-full ${getBarColor(usagePercent)} transition-all duration-500 ease-out`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </>
      )}

      {!isInfinite && creditsRemaining <= 0 && (
        <div className="mt-4 flex items-center gap-2 bg-red-500/20 backdrop-blur px-4 py-3 rounded-[2rem]">
          <AlertTriangle size={18} className="shrink-0 text-red-300" />
          <span className="text-sm font-medium flex-1">{t('limitExceeded') || 'Кредиты закончились'}</span>
          <button
            onClick={() => onPaywall && onPaywall()}
            className="bg-white hover:bg-white/90 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-[2rem] transition-colors shrink-0"
          >
            {t('upgrade') || 'Пополнить'}
          </button>
        </div>
      )}

      {/* Upgrade button — только если не Pro и не Unlimited */}
      {!isProOrUnlimited && creditsRemaining > 0 && (
        <button
          onClick={() => onUpgrade && onUpgrade()}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white py-3 rounded-[2rem] transition-all font-medium border border-white/20"
        >
          <Sparkles size={18} />
          {t('upgradePlan') || 'Улучшить тариф'}
        </button>
      )}
    </div>
  );
};

export default BillingPlans;