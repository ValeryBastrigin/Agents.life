import React from 'react';
import { Wallet, TrendingUp, PieChart, DollarSign } from 'lucide-react';

const Accountant = () => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-400">
            Track your budget, expenses, and financial goals.
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 bg-surface-light dark:bg-surface-dark rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={20} className="text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Balance</span>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">$12,450.00</div>
          </div>
          <div className="p-6 bg-surface-light dark:bg-surface-dark rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Income</span>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">$4,250.00</div>
          </div>
          <div className="p-6 bg-surface-light dark:bg-surface-dark rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={20} className="text-red-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Expenses</span>
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">$2,180.00</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button className="flex flex-col items-center p-6 bg-surface-light dark:bg-surface-dark rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <PieChart size={32} className="text-blue-500 mb-2" />
            <span className="font-medium text-gray-800 dark:text-white">Budget</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-surface-light dark:bg-surface-dark rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <Wallet size={32} className="text-green-500 mb-2" />
            <span className="font-medium text-gray-800 dark:text-white">Expenses</span>
          </button>
          <button className="flex flex-col items-center p-6 bg-surface-light dark:bg-surface-dark rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <TrendingUp size={32} className="text-purple-500 mb-2" />
            <span className="font-medium text-gray-800 dark:text-white">Reports</span>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={20} className="text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Recent Transactions
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp size={16} className="text-green-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">Salary Deposit</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Today</div>
                </div>
              </div>
              <div className="text-green-500 font-semibold">+$4,250.00</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Wallet size={16} className="text-red-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">Grocery Shopping</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Yesterday</div>
                </div>
              </div>
              <div className="text-red-500 font-semibold">-$156.00</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Wallet size={16} className="text-red-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">Utilities</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">2 days ago</div>
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
