import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Calendar, Wallet, MessageSquare, Plus, X as DeleteIcon } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8001';

const Sidebar = ({ isOpen, onClose, theme, chats, onSelectChat, onNewChat, onDeleteChat }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const menuItems = [
    { id: 'secretary', name: 'Secretary', icon: Calendar, path: '/secretary', description: 'Personal assistant for scheduling and organization' },
    { id: 'accountant', name: 'Accountant', icon: Wallet, path: '/accountant', description: 'Financial assistant for budgeting and expenses' },
  ];

  const handleDeleteClick = (e, chatId) => {
    e.stopPropagation();
    setDeleteConfirm(chatId);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm) {
      try {
        await axios.delete(`${API_URL}/api/chats/${deleteConfirm}`);
        if (onDeleteChat) {
          onDeleteChat(deleteConfirm);
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
      }
      setDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

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
            {/* Agents Section */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                Агенты
              </h3>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => {
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl mb-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
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

            {/* Chats Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ваши диалоги с Agents
                </h3>
                <button
                  onClick={() => {
                    onNewChat();
                    onClose();
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Plus size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              {chats && chats.length > 0 ? (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      onSelectChat(chat.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-left group"
                  >
                    <MessageSquare size={18} className="text-gray-500 dark:text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{chat.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(chat.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteClick(e, chat.id)}
                      className="p-1 opacity-40 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                    >
                      <DeleteIcon size={14} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  Нет диалогов
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 max-w-sm w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Удалить диалог?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Вы точно хотите удалить этот диалог? Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
