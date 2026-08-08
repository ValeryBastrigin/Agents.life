import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Calendar, Bell, MessageSquare, Clock, CheckCircle, ArrowRight, Sparkles, BookOpen, FileText, ListTodo } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function SecretaryGuide({ theme }) {
  var { language } = useLanguage();
  var nav = useNavigate();
  var ru = language === 'ru';

  var steps = ru ? [
    { icon: MessageSquare, color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600', t: 'Шаг 1', title: 'Откройте чат с Ixteria',
      body: 'Нажмите на иконку Ixteria в боковом меню. Оркестратор направит запрос Тайм-Менеджеру.',
      cmd: 'Начните диалог в главном чате' },
    { icon: Zap, color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600', t: 'Шаг 2', title: 'Опишите задачу',
      body: 'Напишите что нужно. Ixteria сам поймёт что это для Тайм-Менеджера.',
      cmd: 'Запланируй встречу с Мариной 30 июня в 15:00' },
    { icon: Calendar, color: 'from-emerald-500 to-green-600', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600', t: 'Шаг 3', title: 'С временем → Расписание',
      body: 'Если указано время — событие попадёт в Календарь (Расписание).',
      cmd: 'Встреча с командой завтра с 10 до 11' },
    { icon: Bell, color: 'from-yellow-500 to-amber-600', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-600', t: 'Шаг 4', title: 'Без времени → Напоминание',
      body: 'Если времени нет, но есть дата — Тайм-Менеджер создаст напоминание.',
      cmd: 'Напомни купить подарок 1 июля' },
    { icon: Clock, color: 'from-purple-500 to-violet-600', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600', t: 'Шаг 5', title: 'Проверьте расписание',
      body: 'Спросите о событиях на дату — Тайм-Менеджер покажет всё.',
      cmd: 'Что у меня запланировано на 30 июня?' },
    { icon: FileText, color: 'from-rose-500 to-pink-600', bgColor: 'bg-rose-500/10', textColor: 'text-rose-600', t: 'Шаг 6', title: 'Создавайте заметки голосом',
      body: 'Скажите «Создай заметку» и надиктуйте что угодно — AI сам выделит суть, придумает заголовок и оформит.',
      cmd: 'Создай заметку: купить молоко, хлеб и масло завтра утром' },
    { icon: ListTodo, color: 'from-cyan-500 to-teal-600', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-600', t: 'Шаг 7', title: 'Журнал действий',
      body: 'Все операции фиксируются в Журнале — нажмите «Журнал действий» на странице Тайм-Менеджера.',
      cmd: 'Кнопка на главной странице Тайм-Менеджера' },
  ] : [
    { icon: MessageSquare, color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600', t: 'Step 1', title: 'Open chat with Ixteria',
      body: 'Click Ixteria in the sidebar. The Orchestrator will route to Time-Manager.',
      cmd: 'Start a conversation in the main chat' },
    { icon: Zap, color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600', t: 'Step 2', title: 'Describe your task',
      body: 'Write what you need. Ixteria detects it is for Time-Manager.',
      cmd: 'Schedule a meeting with Marina on June 30 at 3 PM' },
    { icon: Calendar, color: 'from-emerald-500 to-green-600', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600', t: 'Step 3', title: 'With time = Calendar Event',
      body: 'If a time is given, the event goes to Calendar.',
      cmd: 'Team standup tomorrow from 10 to 11' },
    { icon: Bell, color: 'from-yellow-500 to-amber-600', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-600', t: 'Step 4', title: 'Date only = Reminder',
      body: 'If no time but a date exists, Time-Manager creates a reminder.',
      cmd: 'Remind me to buy a gift on July 1' },
    { icon: Clock, color: 'from-purple-500 to-violet-600', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600', t: 'Step 5', title: 'Check schedule',
      body: 'Ask about events on a date.',
      cmd: 'What is scheduled for June 30?' },
    { icon: FileText, color: 'from-rose-500 to-pink-600', bgColor: 'bg-rose-500/10', textColor: 'text-rose-600', t: 'Step 6', title: 'Create notes by voice',
      body: 'Say "Create a note" and dictate anything — AI will extract the essence, title it and format it.',
      cmd: 'Create a note: buy milk, bread and butter tomorrow morning' },
    { icon: ListTodo, color: 'from-cyan-500 to-teal-600', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-600', t: 'Step 7', title: 'Activity Log',
      body: 'All operations are recorded in the Activity Log.',
      cmd: 'Click Activity Log on the Time-Manager page' },
  ];

  return (
    <div className='relative flex-1 overflow-y-auto px-4 sm:px-6 py-6'>
      <div className='max-w-2xl mx-auto relative z-10'>
        {/* Hero Section */}
        <div className='relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-700 dark:via-blue-600 dark:to-indigo-700 rounded-[3.5rem] p-6 sm:p-8 mb-8 shadow-lg shadow-blue-500/20'>
          {/* Decorative elements */}
          <div className='absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4' />
          <div className='absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4' />
          <div className='absolute top-1/3 right-1/3 w-3 h-3 bg-white/20 rounded-full' />
          
          <div className='relative z-10'>
            <button onClick={function(){nav('/secretary')}}
              className='mb-4 inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white rounded-[3.5rem] font-medium transition-all duration-200 border border-white/15 hover:border-white/30 text-sm'>
              <ArrowLeft size={16} />
              <span>{ru ? 'Назад к Тайм-Менеджеру' : 'Back to Time-Manager'}</span>
            </button>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className='flex items-center gap-2 mb-2'>
                <Sparkles size={18} className='text-white/80' />
                <span className='text-white/60 text-sm font-medium uppercase tracking-wider'>
                  {ru ? 'Инструкция' : 'Guide'}
                </span>
              </div>
              <h1 className='text-2xl sm:text-3xl font-bold text-white mb-3'>
                {ru ? 'Как пользоваться Тайм-Менеджером' : 'How to Use Time-Manager'}
              </h1>
               <p className='text-white/70 text-sm max-w-lg leading-relaxed'>
                 {ru ? 'Секретарь-Планировщик — AI-агент для встреч и напоминаний. Работает через оркестратор Ixteria: пишите в общий чат — Ixteria направит запрос Тайм-Менеджеру. А ещё вы можете создавать события и напоминания вручную: просто нажмите на любую дату в календаре ниже.'
                    : 'Secretary-Planner is an AI agent for meetings and reminders. It works through the Ixteria orchestrator: write in the main chat and Ixteria routes to Time-Manager. You can also create events and reminders manually: just click any date on the calendar below.'}
               </p>
            </motion.div>
          </div>
        </div>

        {/* Steps */}
        <div className='space-y-4 mb-8'>
          {steps.map(function(s, i) {
            var Icon = s.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className='relative pl-16'>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className='absolute left-[26px] top-14 bottom-0 w-0.5 bg-gradient-to-b from-blue-400/40 to-transparent' />
                )}
                {/* Step number circle */}
                <div className={'absolute left-0 top-2 w-[52px] h-[52px] rounded-[3.5rem] bg-gradient-to-br ' + s.color + ' flex items-center justify-center shadow-lg shadow-blue-500/20'}>
                  <Icon size={24} className='text-white' />
                </div>
                {/* Card */}
                <div className='rounded-[3.5rem] p-5 sm:p-6 bg-white dark:bg-gray-800/80 backdrop-blur-sm border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-300'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className={'text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-[3rem] ' + s.bgColor + ' ' + s.textColor}>
                      {s.t}
                    </span>
                  </div>
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2'>{s.title}</h3>
                  <p className='text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4'>{s.body}</p>
                  <div className='flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-[3.5rem] px-4 py-3 border border-gray-100 dark:border-gray-600/30'>
                    <ArrowRight size={14} className='text-blue-500 flex-shrink-0' />
                    <code className='text-xs text-gray-600 dark:text-gray-300 font-medium'>{s.cmd}</code>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className='rounded-[3rem] p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 text-center mb-8'>
          <div className='w-12 h-12 mx-auto mb-3 rounded-[3.5rem] bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20'>
            <Zap size={22} className='text-white' />
          </div>
           <p className='text-sm text-blue-700 dark:text-blue-300 font-medium'>
             {ru ? 'Добавляйте события через чат с Ixteria или вручную — нажмите на дату в календаре!' : 'Add events via chat with Ixteria or manually — click a date on the calendar!'}
           </p>
        </div>
      </div>
    </div>
  );
}