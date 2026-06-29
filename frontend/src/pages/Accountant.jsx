import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, TrendingUp, PieChart, DollarSign } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Accountant = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/chat')}
            className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-[3rem] transition-colors"
          >
            <ArrowLeft size={22} className="text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">💰 Бухгалтер</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('accountantWelcome')}
            </p>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 bg-surface-light dark:bg-surface-dark rounded-[3.5rem]">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={20} className="text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('totalBalance')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">$12,450.00</div>
          </div>
          <div className="p-6 bg-surface-light dark:bg-surface-dark rounded-[3.5rem]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('income')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">$4,250.00</div>
          </div>
          <div className="p-6 bg-surface-light dark:bg-surface-dark rounded-[3.5rem]">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={20} className="text-red-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('expenses')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">$2,180.00</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button className="flex flex-col items-center p-6 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <PieChart size={32} className="text-blue-500 mb-2" />
            <span className="font-medium text-gray-800 dark:text-white">{t('budget')}</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <Wallet size={32} className="text-green-500 mb-2" />
            <span className="font-medium text-gray-800 dark:text-white">{t('expenses')}</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-surface-light dark:bg-surface-dark rounded-[3.5rem] hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <TrendingUp size={32} className="text-purple-500 mb-2" />
            <span className="font-medium text-gray-800 dark:text-white">{t('reports')}</span>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-[3.5rem] p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={20} className="text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {t('recentTransactions')}
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-[3rem]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp size={16} className="text-green-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">{t('salaryDeposit')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('today')}</div>
                </div>
              </div>
              <div className="text-green-500 font-semibold">+$4,250.00</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-[3rem]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Wallet size={16} className="text-red-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">{t('groceryShopping')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('yesterday')}</div>
                </div>
              </div>
              <div className="text-red-500 font-semibold">-$156.00</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-[3rem]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Wallet size={16} className="text-red-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">{t('utilities')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('twoDaysAgo')}</div>
                </div>
              </div>
              <div className="text-red-500 font-semibold">-$89.00</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accountant;
