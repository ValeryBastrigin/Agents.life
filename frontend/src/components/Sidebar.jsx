import React from 'react';
import { Link } from 'react-router-dom';
import { X, Calendar, Wallet } from 'lucide-react';

const Sidebar = ({ isOpen, onClose, theme, agents, selectedAgent, onSelectAgent }) => {
  const menuItems = [
    { id: 'secretary', name: 'Secretary', icon: Calendar, path: '/secretary', description: 'Personal assistant for scheduling and organization' },
    { id: 'accountant', name: 'Accountant', icon: Wallet, path: '/accountant', description: 'Financial assistant for budgeting and expenses' },
  ];

  return (
    <>
      {/* Overlay backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-72 bg-background-light dark:bg-background-dark z-50 shadow-2xl transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              AI Agents
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Agents List */}
          <div className="flex-1 overflow-y-auto p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl mb-2 transition-all ${
                    selectedAgent?.name === item.name
                      ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  <div className="text-left flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
