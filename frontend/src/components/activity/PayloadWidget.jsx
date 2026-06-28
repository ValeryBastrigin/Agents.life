import React from 'react';
import { Bell } from 'lucide-react';

export default function PayloadWidget({ payload }) {
  var src = payload.source || '';

  if (src === 'calendar_event') {
    return (
      <div className="bg-black/20 dark:bg-white/5 rounded-[2rem] p-3 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: payload.color || '#3B82F6' }} />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Событие</span>
        </div>
        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">{payload.title}</h5>
        {payload.description && payload.description !== payload.title && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{payload.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {payload.start && <span>Начало: {new Date(payload.start).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
          {payload.end && <span>Конец: {new Date(payload.end).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </div>
    );
  }

  if (src === 'reminder') {
    return (
      <div className="bg-black/20 dark:bg-white/5 rounded-[2rem] p-3 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={14} className="text-yellow-500" />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Напоминание</span>
        </div>
        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">{payload.title || payload.text}</h5>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {payload.date && <span>Дата: {payload.date}</span>}
          {payload.time && <span>Время: {payload.time}</span>}
          <span className={payload.completed ? 'text-emerald-500' : 'text-amber-500'}>
            {payload.completed ? 'Выполнено' : 'Активно'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 dark:bg-white/5 rounded-[2rem] p-3 border border-white/10">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Сообщение</span>
      <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed max-h-48 overflow-y-auto">
        {payload.content ? payload.content.slice(0, 500) : '—'}
      </p>
    </div>
  );
}
