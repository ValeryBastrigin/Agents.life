import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Activity, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LogItem from '../components/activity/LogItem';
import axios from 'axios';

const API_URL = 'http://localhost:8001';
const PAGE_SIZE = 15;

export default function ActivityLog({ theme }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [userId] = useState(1);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async (p, append) => {
    p = p || 1;
    try {
      const res = await axios.get(API_URL + '/api/secretary/logs/' + userId, { params: { page: p, page_size: PAGE_SIZE } });
      const data = res.data;
      if (append) setLogs(function(prev) { return prev.concat(data.logs); });
      else setLogs(data.logs);
      setHasMore(data.has_more); setPage(p);
    } catch (err) { console.error('Activity log error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [userId]);

  useEffect(function() { setLoading(true); setLogs([]); fetchLogs(1, false); }, [fetchLogs]);

  function loadMore() { if (hasMore && !loading) fetchLogs(page + 1, true); }
  function refresh() { setRefreshing(true); fetchLogs(1, false); }

  var filters = [
    { key: 'all', label: language === 'ru' ? 'Все' : 'All' },
    { key: 'calendar', label: language === 'ru' ? 'Календарь' : 'Calendar' },
    { key: 'task', label: language === 'ru' ? 'Задачи' : 'Tasks' },
    { key: 'note', label: language === 'ru' ? 'Заметки' : 'Notes' },
  ];
  var titleText = language === 'ru' ? 'Журнал действий' : 'Activity Log';
  var filteredLogs = filter === 'all' ? logs : logs.filter(function(e) { return e.action_type === filter; });
  var totalText = language === 'ru' ? 'Всего записей: ' + filteredLogs.length : 'Total entries: ' + filteredLogs.length;
  
  return (
    <div className='relative flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6'>
      <div className='max-w-2xl mx-auto relative z-10'>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className='flex items-center justify-between mb-5 sm:mb-6'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <button onClick={function(){navigate('/secretary')}}
              className='p-2.5 sm:p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center'>
              <ArrowLeft size={20} className='text-gray-600 dark:text-gray-400' />
            </button>
            <div>
              <h1 className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-white leading-tight'>{titleText}</h1>
              <p className='text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5'>{totalText}</p>
            </div>
          </div>
          <button onClick={refresh} disabled={refreshing}
            className='p-2.5 sm:p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center'>
            <RefreshCw size={20} className={'text-gray-500'+(refreshing?' animate-spin':'')} />
          </button>
        </motion.div>
        <FilterPills filters={filters} filter={filter} setFilter={setFilter} />
        {loading && <Loader language={language} />}
        {!loading && logs.length === 0 && <EmptyState language={language} />}
        {!loading && logs.length > 0 && (
          <div className='relative'>
            {filteredLogs.map(function(entry, i) {
              var isLast = i === filteredLogs.length - 1 && filter === 'all' && !hasMore;
              return <LogItem key={entry.id} entry={entry} index={i} isLast={isLast} />;
            })}
          </div>
        )}
        {hasMore && !loading && <LoadMoreBtn language={language} loadMore={loadMore} />}
        <div className='h-6 sm:h-8' />
      </div>
    </div>
  );
}
function FilterPills({ filters, filter, setFilter }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className='mb-5 sm:mb-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <Filter size={14} className='text-gray-500 flex-shrink-0' />
        {filters.map(function(f) {
          var isActive = filter === f.key;
          var cls = isActive
            ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/25'
            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500 shadow-sm active:bg-gray-100 dark:active:bg-gray-600';
          return (
            <button key={f.key} onClick={function() { setFilter(f.key); }}
              className={'text-xs font-semibold px-3 py-2 sm:py-1.5 rounded-full border whitespace-nowrap min-h-[36px] flex items-center ' + cls}>
              {f.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function Loader({ language }) {
  return (
    <div className='absolute inset-0 flex flex-col items-center justify-center gap-3'>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
        <Activity size={40} className='text-blue-500' />
      </motion.div>
      <p className='text-sm text-gray-500 dark:text-gray-400'>{language === 'ru' ? 'Загрузка...' : 'Loading...'}</p>
    </div>
  );
}

function EmptyState({ language }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className='flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4'>
      <div className='w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 sm:mb-4'>
        <Activity size={28} className='text-gray-400 dark:text-gray-500' />
      </div>
      <h3 className='text-base sm:text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1'>
        {language === 'ru' ? 'Пока нет записей' : 'No entries yet'}
      </h3>
      <p className='text-sm text-gray-500 dark:text-gray-400 max-w-[260px] sm:max-w-xs'>
        {language === 'ru' ? 'Действия Тайм-Менеджера появятся здесь' : 'Time-Manager actions will appear here'}
      </p>
    </motion.div>
  );
}

function LoadMoreBtn({ language, loadMore }) {
  return (
    <div className='flex justify-center mt-6 mb-8 px-3 sm:px-0'>
      <button onClick={loadMore}
        className='w-full sm:w-auto text-sm font-medium text-blue-500 hover:text-blue-600 active:bg-blue-50 dark:active:bg-blue-900/20 px-6 py-3 sm:py-2.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 transition-all min-h-[48px] sm:min-h-0 flex items-center justify-center'>
        {language === 'ru' ? 'Загрузить ещё' : 'Load More'}
      </button>
    </div>
  );
}
