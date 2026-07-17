import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

// ── Agent data ──
const AGENTS = [
  {
    id: 'secretary',
    name: 'Тайм-менеджер',
    icon: '/assets/icons/agents/секретарь.svg',
    color: 'from-blue-500 to-cyan-400',
    bgColor: 'rgba(37, 99, 235, 0.25)',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    villain: 'Хаос в делах, забытые задачи, потерянное время',
    problem: 'Вы тонете в списках дел? Забываете важные встречи? Тратите часы на планирование вместо реальной работы?',
    internalProblem: 'Чувство тревоги, что вы ничего не успеваете и теряете контроль над своей жизнью.',
    philosophicalProblem: 'Почему в эпоху технологий мы до сих пор ведём списки дел на стикерах?',
    solution: 'Ваш персональный ИИ-секретарь, который помнит всё за вас',
    plan: [
      'Подключите календарь — агент сам соберёт все ваши встречи',
      'Диктуйте задачи голосом — они сразу попадают в умный список',
      'Получайте ежедневный брифинг: что важно сегодня, а что может подождать',
    ],
    results: [
      { label: 'Экономия времени', value: 'до 10 часов в неделю' },
      { label: 'Задач без просрочки', value: 'на 95% больше' },
      { label: 'Напоминаний', value: 'никогда не пропустите' },
    ],
    features: [
      'Автоматическое создание заметок и напоминаний',
      'Интеграция с календарём — всё в одном окне',
      'Умная приоритизация: важное всегда наверху',
      'Отслеживание активности за любой период',
    ],
  },
  {
    id: 'accountant',
    name: 'Финансовый помощник',
    icon: '/assets/icons/agents/бухгалтер.svg',
    color: 'from-purple-500 to-violet-400',
    bgColor: 'rgba(147, 51, 234, 0.25)',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    villain: 'Финансовая неразбериха, скрытые расходы, непонятные отчёты',
    problem: 'Вы точно знаете, куда уходят деньги? Понимаете ли вы свои банковские выписки? Ваш бюджет под контролем или живёт своей жизнью?',
    internalProblem: 'Постоянное беспокойство о деньгах и чувство, что вы не управляете своими финансами.',
    philosophicalProblem: 'Почему управление личными финансами до сих пор такое сложное и непрозрачное?',
    solution: 'ИИ-бухгалтер, который превращает хаос цифр в ясную картину',
    plan: [
      'Загрузите банковскую выписку — агент сам всё проанализирует',
      'Получите категоризацию расходов: еда, транспорт, развлечения',
      'Смотрите рекомендации: где можно сэкономить, а где — инвестировать',
    ],
    results: [
      { label: 'Прозрачность расходов', value: '100% категоризация' },
      { label: 'Сэкономлено в среднем', value: 'до 15 000 ₽/мес' },
      { label: 'Время на анализ', value: '5 минут вместо 3 часов' },
    ],
    features: [
      'Анализ банковских выписок за секунды',
      'Умная категоризация всех транзакций',
      'Отслеживание инвестиционного портфеля',
      'Прогноз бюджета на месяц вперёд',
    ],
  },
  {
    id: 'dietitian',
    name: 'Диетолог',
    icon: '/assets/icons/agents/диетолог.svg',
    color: 'from-emerald-500 to-green-400',
    bgColor: 'rgba(22, 163, 74, 0.25)',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    villain: 'Срыв диет, неправильное питание, потеря мотивации',
    problem: 'Сколько диет вы уже начинали? Сколько раз срывались? Устали от однообразного меню и сложных подсчётов калорий?',
    internalProblem: 'Чувство вины после каждого срыва и неуверенность, что вы когда-нибудь достигнете цели.',
    philosophicalProblem: 'Почему правильное питание должно быть сложным и невкусным?',
    solution: 'Ваш цифровой диетолог, который знает ваши вкусы и цели',
    plan: [
      'Укажите свои предпочтения и цели — агент учтёт всё до мелочей',
      'Получайте персонализированный план питания на неделю',
      'Ведите дневник питания и отслеживайте прогресс',
    ],
    results: [
      { label: 'План питания', value: 'за 30 секунд' },
      { label: 'Учёт предпочтений', value: 'более 50 параметров' },
      { label: 'Приверженность диете', value: 'в 3 раза выше' },
    ],
    features: [
      'Персональный план питания с учётом аллергий и вкусов',
      'Дневник питания для отслеживания калорий и КБЖУ',
      'Умные рекомендации по замене продуктов',
      'Адаптация меню под любые кулинарные предпочтения',
    ],
  },
  {
    id: 'psychologist',
    name: 'Психолог',
    icon: '/assets/icons/agents/психолог.svg',
    color: 'from-pink-500 to-rose-400',
    bgColor: 'rgba(219, 39, 119, 0.25)',
    borderColor: 'border-pink-500/30',
    textColor: 'text-pink-400',
    villain: 'Стресс, выгорание, тревога, подавленные эмоции',
    problem: 'Чувствуете постоянное напряжение? Прокручиваете проблемы в голове перед сном? Эмоциональное выгорание подкралось незаметно?',
    internalProblem: 'Ощущение одиночества в своих переживаниях и страх, что с вами что-то не так.',
    philosophicalProblem: 'Почему забота о психическом здоровье всё ещё стигматизирована и недоступна?',
    solution: 'ИИ-психотерапевт, доступный 24/7 без записи и очередей',
    plan: [
      'Начните сеанс в любое время дня и ночи — агент всегда на связи',
      'Ведите личный дневник: записывайте мысли, сны, эмоции',
      'Получайте поддержку и техники самопомощи между сеансами',
    ],
    results: [
      { label: 'Доступность', value: '24/7 без выходных' },
      { label: 'Техник терапии', value: 'более 30 методик' },
      { label: 'Сеансы', value: 'когда вам удобно' },
    ],
    features: [
      'Терапевтические сеансы с сохранением истории',
      'Дневник снов и эмоций с анализом',
      'Итоги сеансов для отслеживания прогресса',
      'Техники КПТ, осознанности и релаксации',
    ],
  },
  {
    id: 'mentor',
    name: 'Ментор',
    icon: '/assets/icons/agents/ментор.svg',
    color: 'from-amber-500 to-orange-400',
    bgColor: 'rgba(217, 119, 6, 0.3)',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    villain: 'Нет роста, привычки не закрепляются, цели размыты',
    problem: 'Хотите расти, но не знаете с чего начать? Пытаетесь внедрить полезные привычки, но они не держатся дольше недели? Нет системы для достижения целей?',
    internalProblem: 'Чувство стагнации и разочарование в себе из-за того, что вы не раскрываете свой потенциал.',
    philosophicalProblem: 'Почему у одних получается достигать высот, а другие годами топчутся на месте?',
    solution: 'ИИ-ментор, который строит ваш персональный путь развития',
    plan: [
      'Постройте своё Дерево Развития — визуальную карту навыков и целей',
      'Отслеживайте привычки и получайте мотивацию не бросать начатое',
      'Двигайтесь по персональному маршруту: от текущего уровня к желаемому',
    ],
    results: [
      { label: 'Привычек закрепляется', value: 'в 4 раза больше' },
      { label: 'Навыков в дереве', value: 'более 100' },
      { label: 'Прогресс', value: 'визуально и измеримо' },
    ],
    features: [
      'Дерево Развития навыков с уровнями',
      'Трекер привычек с аналитикой и напоминаниями',
      'Персональные рекомендации по развитию',
      'Визуализация прогресса по всем направлениям',
    ],
  },
];

// ── Пульсирующие градиентные сферы для фона ──
const BLUR_COLORS = [
  { color: 'rgba(37, 99, 235, 0.15)', size: 600, x: 20, y: 10, driftX: 25, driftY: 20, speed: 20 },
  { color: 'rgba(147, 51, 234, 0.15)', size: 500, x: 60, y: 40, driftX: -20, driftY: 25, speed: 25 },
  { color: 'rgba(22, 163, 74, 0.12)', size: 450, x: 30, y: 60, driftX: 30, driftY: -15, speed: 22 },
  { color: 'rgba(219, 39, 119, 0.12)', size: 550, x: 70, y: 20, driftX: -25, driftY: 30, speed: 28 },
  { color: 'rgba(217, 119, 6, 0.1)', size: 400, x: 45, y: 70, driftX: 20, driftY: -20, speed: 18 },
];

const AnimatedLandingBg = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {BLUR_COLORS.map((item, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          backgroundColor: item.color,
          filter: 'blur(80px)',
          width: item.size,
          height: item.size,
        }}
        initial={{
          x: `${item.x}%`,
          y: `${item.y}%`,
          scale: 0.9,
        }}
        animate={{
          x: `${item.x + item.driftX}%`,
          y: `${item.y + item.driftY}%`,
          scale: 1.1,
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          x: { duration: item.speed, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
          y: { duration: item.speed * 1.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
          scale: { duration: item.speed * 0.7, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
          opacity: { duration: item.speed * 0.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
        }}
      />
    ))}
  </div>
);

// ── Парящие иконки агентов — fixed на весь viewport ──
// Координаты в vw/vh, чтобы иконки летали по всему экрану независимо от скролла
const FLOATING_AGENTS = [
  { icon: AGENTS[0].icon, x: 5, y: 12, driftX: 20, driftY: 18, delay: 0, scale: 0.8, blur: 'blur-sm' },
  { icon: AGENTS[1].icon, x: 78, y: 8, driftX: -18, driftY: 30, delay: 1.5, scale: 0.75, blur: 'blur-sm' },
  { icon: AGENTS[2].icon, x: 2, y: 68, driftX: 22, driftY: -12, delay: 0.8, scale: 0.7, blur: 'blur-[2px]' },
  { icon: AGENTS[3].icon, x: 82, y: 72, driftX: -12, driftY: -18, delay: 2.2, scale: 0.8, blur: 'blur-sm' },
  { icon: AGENTS[4].icon, x: 42, y: 3, driftX: 8, driftY: 40, delay: 3, scale: 0.65, blur: 'blur-[2px]' },
];

const FloatingIcons = () => (
  <>
    {FLOATING_AGENTS.map((agent, i) => (
      <motion.div
        key={i}
        className={`fixed pointer-events-none z-0 ${agent.blur}`}
        style={{
          width: 140,
          height: 140,
        }}
        initial={{
          left: `${agent.x}vw`,
          top: `${agent.y}vh`,
          scale: agent.scale,
          rotate: 0,
        }}
        animate={{
          left: `${agent.x + agent.driftX}vw`,
          top: `${agent.y + agent.driftY}vh`,
          rotate: [0, 10, -10, 5, 0],
          scale: [agent.scale, agent.scale * 1.3, agent.scale],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          left: { duration: 12 + i * 2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: agent.delay },
          top: { duration: 10 + i * 2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: agent.delay },
          rotate: { duration: 8 + i, repeat: Infinity, ease: 'easeInOut', delay: agent.delay },
          scale: { duration: 6 + i, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: agent.delay },
          opacity: { duration: 5 + i, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: agent.delay },
        }}
      >
        <div className="w-full h-full rounded-3xl bg-gray-900/40 backdrop-blur-xl border border-white/10 p-6 shadow-2xl">
          <img src={agent.icon} alt="" className="w-full h-full object-contain drop-shadow-lg" />
        </div>
      </motion.div>
    ))}
  </>
);

// ── Один агент (секция) ──
function AgentSection({ agent, index }) {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.9, 1, 1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [60, 0, 0, -30]);

  const isEven = index % 2 === 0;

  return (
    <motion.section
      ref={sectionRef}
      style={{ opacity, scale, y }}
      className="min-h-screen flex items-center justify-center py-20 px-6 relative z-10"
    >
      <div className="max-w-6xl mx-auto w-full">
        <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-20`}>
          {/* ── Иконка агента с подсветкой ── */}
          <motion.div
            className="flex-shrink-0 relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-60"
              style={{ backgroundColor: agent.bgColor }}
            />
            <div className={`w-48 h-48 lg:w-64 lg:h-64 rounded-full bg-gradient-to-br ${agent.color} p-[3px] shadow-2xl`}>
              <div className="w-full h-full rounded-full bg-gray-900/90 flex items-center justify-center p-8">
                <img
                  src={agent.icon}
                  alt={agent.name}
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>
            </div>
          </motion.div>

          {/* ── Контент ── */}
          <div className="flex-1 space-y-8">
            <div>
              <span className={`text-sm font-semibold uppercase tracking-widest ${agent.textColor}`}>
                AI-агент
              </span>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mt-2">
                {agent.name}
              </h2>
            </div>

            {/* ПРОБЛЕМА */}
            <div className="space-y-3">
              <p className="text-red-400/80 text-sm font-medium uppercase tracking-wide">
                С чем вы сталкиваетесь
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                {agent.problem}
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 space-y-3">
                <p className="text-gray-400 text-sm leading-relaxed">
                  <span className="text-red-400/70 font-medium">Внутренний конфликт: </span>
                  {agent.internalProblem}
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  <span className="text-red-400/70 font-medium">Философский вопрос: </span>
                  {agent.philosophicalProblem}
                </p>
              </div>
            </div>

            {/* РЕШЕНИЕ */}
            <div className="space-y-3">
              <p className={`${agent.textColor} text-sm font-medium uppercase tracking-wide`}>
                Решение
              </p>
              <p className="text-white text-xl font-semibold leading-relaxed">
                {agent.solution}
              </p>
              <div className={`bg-gradient-to-r ${agent.color} bg-opacity-10 border ${agent.borderColor} rounded-2xl p-5`}>
                <p className="text-white/80 text-sm font-medium mb-3">План действий:</p>
                <ol className="space-y-2">
                  {agent.plan.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center text-white text-xs font-bold mt-0.5`}>
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* РЕЗУЛЬТАТЫ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {agent.results.map((result, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <div className={`text-2xl font-bold bg-gradient-to-r ${agent.color} bg-clip-text text-transparent`}>
                    {result.value}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">{result.label}</div>
                </div>
              ))}
            </div>

            {/* Функции */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {agent.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                  <svg className={`flex-shrink-0 w-4 h-4 ${agent.textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(heroScroll, [0, 1], [1, 0]);
  const heroY = useTransform(heroScroll, [0, 1], [0, -100]);
  const heroScale = useTransform(heroScroll, [0, 1], [1, 0.95]);

  return (
    <div className="relative min-h-screen bg-gray-950 text-white">
      {/* ── Переливающийся фон ── */}
      <AnimatedLandingBg />

      {/* ── Парящие иконки агентов (поверх фона, но под контентом) ── */}
      <FloatingIcons />

      {/* ── Навигация (Вход) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/assets/icons/agents/ixteria.svg" alt="Ixteria" className="w-8 h-8" />
          <span className="text-xl font-bold text-white">Ixteria</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all duration-300 hover:scale-105 backdrop-blur-md"
        >
          Вход
        </button>
      </header>

      {/* ── Хиро-секция ── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
        className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative z-10"
      >
        {/* ── Иконка Ixteria (без круглого контейнера) ── */}
        <motion.div
          className="mb-8 relative"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.2 }}
        >
          {/* Свечение */}
          <div className="absolute inset-0 rounded-full blur-[100px] bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40 scale-[2] animate-pulse" />
          <div className="absolute inset-0 rounded-full blur-[60px] bg-gradient-to-br from-cyan-400/30 to-violet-500/30 scale-150" />

          {/* Только иконка, без круга-контейнера */}
          <img
            src="/assets/icons/agents/ixteria.svg"
            alt="Ixteria"
            className="w-40 h-40 lg:w-56 lg:h-56 object-contain drop-shadow-2xl relative"
          />
        </motion.div>

        {/* Заголовок — серебристый */}
        <motion.h1
          className="text-6xl lg:text-8xl font-black mb-6 leading-tight relative z-10 tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <span className="bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent drop-shadow-lg">
            Ixteria
          </span>
        </motion.h1>

        {/* Подзаголовок */}
        <motion.p
          className="text-lg lg:text-2xl text-gray-300 max-w-3xl leading-relaxed mb-10 relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Соберите команду ИИ-агентов: от финансового аналитика и диетолога
          до тайм-менеджера и психотерапевта.
          <br />
          <span className="text-white font-semibold">
            Автоматизируй жизнь и работу вместе с Ixteria.
          </span>
        </motion.p>

        {/* Скролл-индикатор */}
        <motion.div
          className="absolute bottom-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-gray-500 flex flex-col items-center gap-2"
          >
            <span className="text-xs uppercase tracking-widest">Узнать больше</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ── Секции агентов ── */}
      <div className="relative z-10">
        {AGENTS.map((agent, index) => (
          <AgentSection key={agent.id} agent={agent} index={index} />
        ))}
      </div>

      {/* ── CTA: Начать использовать ── */}
      <motion.section
        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 relative z-10 pb-20"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-2xl">
          <motion.h2
            className="text-4xl lg:text-5xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Готовы собрать свою{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              команду ИИ-агентов
            </span>
            ?
          </motion.h2>

          <motion.p
            className="text-gray-400 text-lg mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            Пять специалистов, одна платформа. Финансы, питание, продуктивность,
            психологическая поддержка и развитие — всё в одном окне.
          </motion.p>

          <motion.button
            onClick={() => navigate('/login')}
            className="px-10 py-4 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white text-lg font-semibold shadow-2xl shadow-purple-500/30 hover:scale-105 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Начать использовать
          </motion.button>

          <motion.p
            className="text-gray-600 text-sm mt-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            Бесплатный старт • Без привязки карты • 5 агентов в базовом плане
          </motion.p>
        </div>
      </motion.section>

      {/* ── Футер ── */}
      <footer className="relative z-10 text-center py-8 border-t border-white/10">
        <p className="text-gray-600 text-sm">
          © 2026 Ixteria. Все права защищены.
        </p>
      </footer>
    </div>
  );
}