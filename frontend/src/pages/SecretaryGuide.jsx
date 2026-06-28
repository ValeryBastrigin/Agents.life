import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Calendar, Bell, MessageSquare, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function SecretaryGuide() {
  var { language } = useLanguage();
  var nav = useNavigate();
  var ru = language === 'ru';

  var steps = ru ? [
    { icon: MessageSquare, color: 'from-blue-500 to-indigo-600', t: 'Шаг 1', title: 'Откройте чат с Ixteria',
      body: 'Нажмите на иконку Ixteria в боковом меню. Оркестратор направит запрос Секретарю.',
      cmd: 'Начните диалог в главном чате' },
    { icon: Zap, color: 'from-amber-500 to-orange-600', t: 'Шаг 2', title: 'Опишите задачу',
      body: 'Напишите что нужно. Ixteria сам поймёт что это для Секретаря.',
      cmd: 'Запланируй встречу с Мариной 30 июня в 15:00' },
    { icon: Calendar, color: 'from-emerald-500 to-green-600', t: 'Шаг 3', title: 'С временем → Расписание',
      body: 'Если указано время — событие попадёт в Календарь (Расписание).',
      cmd: 'Встреча с командой завтра с 10 до 11' },
    { icon: Bell, color: 'from-yellow-500 to-amber-600', t: 'Шаг 4', title: 'Без времени → Напоминание',
      body: 'Если времени нет, но есть дата — Secretary создаст напоминание.',
      cmd: 'Напомни купить подарок 1 июля' },
    { icon: Clock, color: 'from-purple-500 to-violet-600', t: 'Шаг 5', title: 'Проверьте расписание',
      body: 'Спросите о событиях на дату — Secretary покажет всё.',
      cmd: 'Что у меня запланировано на 30 июня?' },
    { icon: CheckCircle, color: 'from-rose-500 to-pink-600', t: 'Шаг 6', title: 'Создавайте заметки голосом',
      body: 'Скажите «Создай заметку» и надиктуйте что угодно — AI сам выделит суть, придумает заголовок и оформит.',
      cmd: 'Создай заметку: купить молоко, хлеб и масло завтра утром' },
    { icon: CheckCircle, color: 'from-cyan-500 to-teal-600', t: 'Шаг 7', title: 'Журнал действий',
      body: 'Все операции фиксируются в Журнале — нажмите «Последние записи».',
      cmd: 'Кнопка на странице Секретаря' },
  ] : [
    { icon: MessageSquare, color: 'from-blue-500 to-indigo-600', t: 'Step 1', title: 'Open chat with Ixteria',
      body: 'Click Ixteria in the sidebar. The Orchestrator will route to Secretary.',
      cmd: 'Start a conversation in the main chat' },
    { icon: Zap, color: 'from-amber-500 to-orange-600', t: 'Step 2', title: 'Describe your task',
      body: 'Write what you need. Ixteria detects it is for Secretary.',
      cmd: 'Schedule a meeting with Marina on June 30 at 3 PM' },
    { icon: Calendar, color: 'from-emerald-500 to-green-600', t: 'Step 3', title: 'With time = Calendar Event',
      body: 'If a time is given, the event goes to Calendar.',
      cmd: 'Team standup tomorrow from 10 to 11' },
    { icon: Bell, color: 'from-yellow-500 to-amber-600', t: 'Step 4', title: 'Date only = Reminder',
      body: 'If no time but a date exists, Secretary creates a reminder.',
      cmd: 'Remind me to buy a gift on July 1' },
    { icon: Clock, color: 'from-purple-500 to-violet-600', t: 'Step 5', title: 'Check schedule',
      body: 'Ask about events on a date.',
      cmd: 'What is scheduled for June 30?' },
    { icon: CheckCircle, color: 'from-rose-500 to-pink-600', t: 'Step 6', title: 'Create notes by voice',
      body: 'Say "Create a note" and dictate anything — AI will extract the essence, title it and format it.',
      cmd: 'Create a note: buy milk, bread and butter tomorrow morning' },
    { icon: CheckCircle, color: 'from-cyan-500 to-teal-600', t: 'Step 7', title: 'Activity Log',
      body: 'All operations are recorded in the Activity Log.',
      cmd: 'Click Recent Records on the Secretary page' },
  ];

  return (
    <div className='flex-1 overflow-y-auto bg-background-light dark:bg-background-dark'>
      {/* Hero Card - rounded, floating above steps */}
      <div className='px-4 sm:px-8 pt-6 sm:pt-10 pb-2'>
        <div className='max-w-2xl mx-auto'>
          <div className='relative overflow-hidden rounded-[2rem] bg-white dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/40 shadow-xl shadow-blue-500/5 dark:shadow-black/20'>
            {/* Decorative gradient blob */}
            <div className='absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 dark:from-blue-500/15 dark:to-purple-500/15 rounded-full blur-3xl pointer-events-none' />
            <div className='absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-indigo-400/15 to-cyan-400/15 dark:from-indigo-500/10 dark:to-cyan-500/10 rounded-full blur-2xl pointer-events-none' />
            <div className='relative p-6 sm:p-8'>
              <button onClick={function(){nav('/secretary')}}
                className='mb-5 p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>
                <ArrowLeft size={18} /> <span className='text-sm'>{ru ? 'Назад к Секретарю' : 'Back to Secretary'}</span>
              </button>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3'>
                  {ru ? 'Как пользоваться Секретарём' : 'How to Use Secretary'}
                </h1>
                <p className='text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg'>
              {ru ? 'Secretary — AI-агент для встреч и напоминаний. Работает через оркестратор Ixteria: пишите в общий чат, Ixteria направит запрос Секретарю.'
                 : 'Secretary is an AI agent for meetings and reminders. Works through the Ixteria orchestrator: write in the main chat, Ixteria routes to Secretary.'}
            </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Steps section */}
      <div className='px-4 sm:px-8 py-6 sm:py-10'>
        <div className='max-w-2xl mx-auto space-y-5'>
          {steps.map(function(s, i) {
            var Icon = s.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className='relative pl-14'>
                {i < steps.length - 1 && <div className='absolute left-[23px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-blue-400/40 to-transparent' />}
                <div className={'absolute left-0 top-0 w-[46px] h-[46px] rounded-full bg-gradient-to-br ' + s.color + ' flex items-center justify-center shadow-lg'}>
                  <Icon size={22} className='text-white' />
                </div>
                <div className='rounded-2xl p-5 sm:p-6 shadow-lg bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/50'>
                  <span className='text-blue-500 font-bold text-sm mb-1'>{s.t}</span>
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2'>{s.title}</h3>
                  <p className='text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3'>{s.body}</p>
                  <div className='flex items-center gap-2 bg-gray-100 dark:bg-gray-900/60 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-700/30'>
                    <ArrowRight size={14} className='text-blue-500 flex-shrink-0' />
                    <code className='text-xs text-gray-600 dark:text-gray-300 font-medium'>{s.cmd}</code>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className='max-w-2xl mx-auto mt-8'>
          <div className='bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30 text-center'>
            <p className='text-sm text-blue-700 dark:text-blue-300 font-medium'>
              {ru ? 'Секретарь работает только через чат с Ixteria — просто пишите!' : 'Secretary works through the Ixteria chat — just type!'}
            </p>
          </div>
        </div>
        <div className='h-12' />
      </div>
    </div>
  );
}
