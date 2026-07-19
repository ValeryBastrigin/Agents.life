import React, { useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useAnimation } from 'framer-motion';

// ── Agent data ── (unchanged)
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

// ── ═══ СТАР-ПАРТИКЛЫ ═══ ──
function StarField() {
  const stars = useMemo(() => {
    const result = [];
    for (let i = 0; i < 80; i++) {
      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.15,
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 5,
      });
    }
    return result;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
          animate={{
            opacity: [star.opacity, star.opacity * 2.5, star.opacity],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ── ═══ ПУЛЬСИРУЮЩИЕ СФЕРЫ ═══ ──
const BLUR_COLORS = [
  { color: 'rgba(37, 99, 235, 0.15)', size: 600, x: 20, y: 10, driftX: 25, driftY: 20, speed: 20 },
  { color: 'rgba(147, 51, 234, 0.15)', size: 500, x: 60, y: 40, driftX: -20, driftY: 25, speed: 25 },
  { color: 'rgba(22, 163, 74, 0.12)', size: 450, x: 30, y: 60, driftX: 30, driftY: -15, speed: 22 },
  { color: 'rgba(219, 39, 119, 0.12)', size: 550, x: 70, y: 20, driftX: -25, driftY: 30, speed: 28 },
  { color: 'rgba(217, 119, 6, 0.1)', size: 400, x: 45, y: 70, driftX: 20, driftY: -20, speed: 18 },
];

function AnimatedLandingBg() {
  return (
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
}

// ── ═══ ПАРЯЩИЕ ИКОНКИ АГЕНТОВ НА ФОНЕ ═══ ──
const FLOATING_AGENTS = [
  { icon: '/assets/icons/agents/секретарь.svg', x: 5, y: 10, driftX: 10, driftY: -8, speed: 14, size: 72 },
  { icon: '/assets/icons/agents/бухгалтер.svg', x: 82, y: 18, driftX: -8, driftY: 10, speed: 18, size: 64 },
  { icon: '/assets/icons/agents/диетолог.svg', x: 8, y: 50, driftX: 6, driftY: 10, speed: 16, size: 60 },
  { icon: '/assets/icons/agents/психолог.svg', x: 80, y: 55, driftX: -10, driftY: -8, speed: 20, size: 68 },
  { icon: '/assets/icons/agents/ментор.svg', x: 48, y: 5, driftX: 5, driftY: 8, speed: 12, size: 78 },
  { icon: '/assets/icons/agents/финансовый ассистент.png', x: 15, y: 78, driftX: 8, driftY: -6, speed: 22, size: 56 },
];

// Дополнительные фоновые иконки для заполнения всей высоты страницы
const FLOATING_AGENTS_EXTRA = [
  { icon: '/assets/icons/agents/секретарь.svg', x: 90, y: 42, driftX: -7, driftY: 8, speed: 19, size: 52 },
  { icon: '/assets/icons/agents/бухгалтер.svg', x: 3, y: 33, driftX: 8, driftY: -9, speed: 21, size: 48 },
  { icon: '/assets/icons/agents/диетолог.svg', x: 72, y: 75, driftX: -6, driftY: 7, speed: 17, size: 48 },
  { icon: '/assets/icons/agents/психолог.svg', x: 28, y: 90, driftX: 7, driftY: -6, speed: 23, size: 52 },
  { icon: '/assets/icons/agents/ментор.svg', x: 58, y: 45, driftX: -8, driftY: 7, speed: 15, size: 56 },
  { icon: '/assets/icons/agents/финансовый ассистент.png', x: 38, y: 22, driftX: 6, driftY: 8, speed: 20, size: 44 },
];

function FloatingAgentsBg() {
  const allAgents = [...FLOATING_AGENTS, ...FLOATING_AGENTS_EXTRA];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {allAgents.map((a, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${a.x}%`,
            top: `${a.y}%`,
            width: a.size,
            height: a.size,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            x: [0, a.driftX * 2, 0],
            y: [0, a.driftY * 2, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.15, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: a.speed + 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 1.5,
          }}
        >
          <img
            src={a.icon}
            alt=""
            className="w-full h-full object-contain"
            style={{ filter: 'brightness(1.1) saturate(0.9) drop-shadow(0 0 6px rgba(255,255,255,0.12))' }}
          />
        </motion.div>
      ))}
    </div>
  );
}



// ── ═══ АНИМИРОВАННЫЙ ЛОГОТИП IXTERIA ═══ ──
function AnimatedIxteriaLogo() {
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ marginTop: '-96px' }}>
      {/* Внешнее свечение */}
      <motion.div
        className="absolute rounded-full blur-[120px] bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 scale-[3]"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [2.5, 3.2, 2.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full blur-[80px] bg-gradient-to-br from-cyan-400/20 to-violet-500/20 scale-[2]"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [1.8, 2.4, 1.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Центральная иконка — появляется с масштабом и вращением */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, rotate: -180, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 12, delay: 0.15 }}
      >
        <motion.div
          className="w-[57vw] h-[57vw] max-w-[330px] max-h-[330px]"
          animate={{
            y: [0, -10, 0],
            rotate: [0, 4, -4, 0],
          }}
          transition={{
            y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <img
            src="/assets/icons/agents/ixteria.svg"
            alt="Ixteria"
            className="w-full h-full object-contain drop-shadow-2xl"
          />
        </motion.div>
      </motion.div>

      {/* Серебристая надпись Ixteria под иконкой */}
      <motion.div
        className="mt-2 text-center relative z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <span
          className="text-2xl lg:text-3xl font-bold tracking-[0.15em] uppercase"
          style={{
            background: 'linear-gradient(135deg, #e8e8e8 0%, #a0a0a0 50%, #e8e8e8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(200,200,200,0.2), 0 0 40px rgba(200,200,200,0.1)',
          }}
        >
          Ixteria
        </span>
      </motion.div>
    </div>
  );
}

// ── ═══ СЕКЦИЯ "ОБЗОР АГЕНТОВ" (вторая секция) ═══ ──
const AGENT_DESCRIPTIONS = {
  'Тайм-менеджер': 'Создавайте расписание, планируйте дела, обсуждайте события',
  'Финансовый помощник': 'Анализируйте расходы и инвестиции, обсуждайте траты и доходы с агентом',
  'Диетолог': 'Обсуждайте питание, следите за КБЖУ, создавайте индивидуальный рацион',
  'Психолог': 'Начинайте сеансы психотерапии, открывайтесь, анализируйте ваши сеансы вместе с психологом',
  'Ментор': 'Обсудите свою мечту с Ментором и сделайте ее реальной',
};

function AgentsOverviewSection() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const bgOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.3, 1, 1, 0.3]);
  const bgY = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [40, 0, 0, -20]);

  return (
    <motion.section
      ref={sectionRef}
      style={{ opacity: bgOpacity, y: bgY }}
      className="min-h-screen flex items-center justify-center py-4 px-4 relative z-10"
    >
      <div className="max-w-6xl mx-auto w-full">
        <motion.h2
          className="text-2xl lg:text-4xl font-bold text-white mb-1 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          Ваши{' '}
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI-агенты
          </span>
        </motion.h2>

        <motion.p
          className="text-gray-400 text-xs lg:text-sm max-w-xl mx-auto mb-3 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          Каждый — эксперт в своей области. Нажмите, чтобы узнать больше.
        </motion.p>

        <div className="flex flex-col gap-3 lg:gap-4 max-w-2xl mx-auto mb-10">
          {AGENTS.map((agent) => (
            <motion.div
              key={agent.id}
              whileHover={{ scale: 1.02, x: 6 }}
              whileTap={{ scale: 0.99 }}
              className="relative group cursor-pointer flex items-center gap-4 lg:gap-6 px-4 lg:px-6 py-3 lg:py-4 rounded-2xl
                bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]
                shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              onClick={() => {
                const el = document.getElementById(`agent-${agent.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ type: 'spring', stiffness: 180, damping: 18, delay: AGENTS.indexOf(agent) * 0.08 }}
            >
              {/* Glow on hover */}
              <div
                className="absolute -inset-2 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
                style={{ backgroundColor: agent.bgColor }}
              />

              {/* Bouncing icon — слева */}
              <motion.div
                className="relative z-10 flex-shrink-0"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: AGENTS.indexOf(agent) * 0.3,
                }}
              >
                <img
                  src={agent.icon}
                  alt={agent.name}
                  className="w-[16vw] h-[16vw] max-w-[70px] max-h-[70px] lg:max-w-[90px] lg:max-h-[90px] object-contain drop-shadow-lg"
                />
              </motion.div>

              {/* Текстовая часть */}
              <div className="relative z-10 flex flex-col min-w-0">
                <span className={`font-semibold text-sm lg:text-lg ${agent.textColor} leading-tight`}>
                  {agent.name}
                </span>
                <span className="text-gray-400 text-[10px] lg:text-sm leading-snug mt-0.5">
                  {AGENT_DESCRIPTIONS[agent.name]}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Сравнение: LLM vs Ixteria Agents */}
        <motion.div
          className="max-w-2xl mx-auto px-4 py-6 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 backdrop-blur-sm"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <h3 className="text-base lg:text-xl font-bold text-white mb-4 text-center">
            Не просто{' '}
            <span className="bg-gradient-to-r from-gray-400 to-gray-300 bg-clip-text text-transparent line-through decoration-2 decoration-gray-600">
              LLM
            </span>
            , а{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              живые помощники
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-red-400 font-semibold text-xs">Обычный LLM-чат</span>
              </div>
              <ul className="space-y-1.5 text-gray-400 text-[10px] lg:text-xs">
                <li className="flex items-start gap-1">
                  <span className="text-red-400/60 mt-0.5">•</span>
                  Не знает, кто вы и что для вас важно
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-red-400/60 mt-0.5">•</span>
                  Каждый раз начинает с чистого листа
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-red-400/60 mt-0.5">•</span>
                  Не помнит ваши дела, финансы и цели
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-red-400/60 mt-0.5">•</span>
                  Работает в одиночку, без связи с другими
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-emerald-400 font-semibold text-xs">AI-агенты Ixteria</span>
              </div>
              <ul className="space-y-1.5 text-gray-300 text-[10px] lg:text-xs">
                <li className="flex items-start gap-1">
                  <span className="text-emerald-400/60 mt-0.5">•</span>
                  Знают контекст вашей жизни, привычек и целей
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-emerald-400/60 mt-0.5">•</span>
                  Общаются друг с другом для комплексной автоматизации
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-emerald-400/60 mt-0.5">•</span>
                  Каждый — эксперт в своей сфере, но работают как команда
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-emerald-400/60 mt-0.5">•</span>
                  Постоянно учатся на ваших данных и становятся точнее
                </li>
              </ul>
            </div>
          </div>

          <motion.p
            className="text-gray-500 italic text-[10px] lg:text-xs mt-4 text-center max-w-md mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: 0.6 }}
          >
            «Мы создали не просто чат-ботов, а команду цифровых сотрудников,
            которые действительно понимают вашу жизнь и работают сообща,
            чтобы вы могли заниматься тем, что действительно важно.»
          </motion.p>
        </motion.div>
      </div>
    </motion.section>
  );
}

// ── ═══ СЕКЦИЯ ОДНОГО АГЕНТА ═══ ──
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
      id={`agent-${agent.id}`}
      ref={sectionRef}
      style={{ opacity, scale, y }}
      className="min-h-screen flex items-center justify-center py-20 px-6 relative z-10"
    >
      <div className="max-w-6xl mx-auto w-full">
        <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-20`}>
          <motion.div
            className="flex-shrink-0 relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div
              className="absolute inset-0 rounded-full blur-[80px] opacity-50 scale-150"
              style={{ backgroundColor: agent.bgColor }}
            />
            <img
              src={agent.icon}
              alt={agent.name}
              className="w-48 h-48 lg:w-64 lg:h-64 object-contain drop-shadow-2xl relative"
            />
          </motion.div>

          <div className="flex-1 space-y-8">
            <div>
              <span className={`text-sm font-semibold uppercase tracking-widest ${agent.textColor}`}>
                AI-агент
              </span>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mt-2">
                {agent.name}
              </h2>
            </div>

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

// ── ═══ ГЛАВНЫЙ ЭКСПОРТ ═══ ──
export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(heroScroll, [0, 0.5], [1, 0]);
  const heroY = useTransform(heroScroll, [0, 0.5], [0, -80]);
  const heroScale = useTransform(heroScroll, [0, 0.5], [1, 0.95]);

  // При перезагрузке — скроллим наверх, чтобы избежать "швыряния"
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0e1a] text-white overflow-x-hidden">
      {/* ── Фоновые элементы (применяются ко всей странице) ── */}
      {/* Глубокий космический градиент */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(25, 60, 150, 0.25) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 80% 50% at 80% 100%, rgba(100, 30, 180, 0.15) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 60% 40% at 20% 80%, rgba(30, 100, 200, 0.12) 0%, transparent 50%), ' +
            'linear-gradient(180deg, #0a0e1a 0%, #0d1428 40%, #0f0b1a 100%)',
        }}
      />

      {/* Мерцающие звёзды */}
      <StarField />

      {/* Пульсирующие градиентные сферы */}
      <AnimatedLandingBg />

      {/* Парящие иконки агентов на фоне */}
      <FloatingAgentsBg />

      {/* ── ХЕДЕР (фиксированный) ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingLeft: 'max(24px, env(safe-area-inset-left))',
          paddingRight: 'max(24px, env(safe-area-inset-right))',
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/assets/icons/agents/ixteria.svg"
            alt="Ixteria"
            className="w-9 h-9 lg:w-11 lg:h-11 drop-shadow-lg"
          />
          <span className="text-xl lg:text-2xl font-bold text-white tracking-tight">Ixteria</span>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2 lg:px-7 lg:py-2.5 rounded-full border border-white/25 text-white/90 text-sm lg:text-base font-medium
            hover:bg-white/10 hover:border-white/40 transition-all duration-300 backdrop-blur-md active:scale-95"
        >
          Вход
        </button>
      </header>

      {/* ── SPACER ДЛЯ ФИКСИРОВАННОГО ХЕДЕРА ── */}
      <div className="h-12 lg:h-16" />

      {/* ── ВСЕ ЭЛЕМЕНТЫ СТРАНИЦЫ ПОДНЯТЫ НА 24px ВВЕРХ (кроме хедера) ── */}
      <div style={{ marginTop: '-48px' }}>

      {/* ── HERO-СЕКЦИЯ ── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
        className="relative z-10 flex flex-col items-center min-h-screen px-6"
      >
        {/* ══ ВЕРХНИЙ БЛОК: текст (расширен на ПК) ══ */}
        <div className="w-full max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto flex flex-col items-start flex-1 justify-center gap-2 -mt-4 lg:-mt-8">
          {/* Badge — поднят выше */}
          <motion.div
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-white/70 text-xs lg:text-sm font-medium tracking-wide backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <span className="text-sm">✨</span>
            <span>Ваши ИИ-агенты в одном месте</span>
          </motion.div>

          {/* H1 заголовок — увеличен и расширен на ПК */}
          <motion.h1
            className="text-[2rem] lg:text-[4.2rem] xl:text-[4.8rem] leading-[1.1] font-extrabold tracking-tight text-white w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <span className="block">Ваши персональные</span>
            <span className="block">
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                ИИ-агенты
              </span>
            </span>
            <span className="block">для работы и жизни</span>
          </motion.h1>

          {/* Описание — расширен на ПК */}
          <motion.p
            className="text-gray-400 text-sm lg:text-lg leading-relaxed max-w-sm lg:max-w-xl xl:max-w-2xl mb-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
          >
            Финансы, здоровье, продуктивность и развитие — доверяйте задачи своим ИИ-агентам. Они работают, пока вы занимаетесь важным.
          </motion.p>
        </div>

        {/* ══ АНИМИРОВАННЫЙ ЛОГОТИП IXTERIA (увеличен в 2 раза, с левитацией) ══ */}
        <div className="relative w-full flex-1 flex items-center justify-center my-1">
          <AnimatedIxteriaLogo />
        </div>

        {/* ══ CTA КНОПКА ══ */}
        <motion.div
          className="w-full max-w-lg mx-auto mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 lg:py-5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
              text-white text-lg lg:text-xl font-semibold tracking-wide
              shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30
              active:scale-[0.98] transition-all duration-200
              flex items-center justify-center gap-2"
          >
            <span>Попробовать бесплатно</span>
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </motion.div>

        {/* ══ БЛОК ДОВЕРИЯ ══ */}
        <motion.div
          className="flex items-center justify-center gap-2 text-gray-500 text-xs lg:text-sm mb-4 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.6 }}
        >
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Бесплатный доступ
          </span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Без карты
          </span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Отмена в любой момент
          </span>
        </motion.div>

        {/* ══ СКРОЛЛ-ИНДИКАТОР ══ */}
        <motion.div
          className="relative"
          style={{
            marginBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <motion.div
            animate={{
              y: [0, 8, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="flex flex-col items-center gap-0.5"
          >
            <span className="text-[9px] lg:text-[10px] uppercase tracking-[0.25em] text-gray-600 font-medium">
              Листайте
            </span>
            <svg
              className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ── СЕКЦИЯ "ОБЗОР АГЕНТОВ" ── */}
      <AgentsOverviewSection />

      {/* ── СЕКЦИИ АГЕНТОВ ── */}
      <div className="relative z-10">
        {AGENTS.map((agent, index) => (
          <AgentSection key={agent.id} agent={agent} index={index} />
        ))}
      </div>

      {/* ── CTA: НАЧАТЬ ИСПОЛЬЗОВАТЬ ── */}
      <motion.section
        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 relative z-10 pb-20"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <motion.h2
          className="text-4xl lg:text-5xl font-bold text-white mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Готовы начать?
        </motion.h2>

        <motion.p
          className="text-gray-400 text-lg max-w-md mx-auto mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          Соберите свою команду ИИ-агентов уже сегодня.
        </motion.p>

        <motion.button
          onClick={() => navigate('/login')}
          className="px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
            text-white text-lg font-semibold tracking-wide
            shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30
            active:scale-[0.98] transition-all duration-200"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.5, duration: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          Попробовать бесплатно
        </motion.button>
      </motion.section>

      </div>

      {/* ── ФУТЕР ── */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/assets/icons/agents/ixteria.svg"
              alt="Ixteria"
              className="w-6 h-6 opacity-40"
            />
            <span className="text-gray-500 text-sm font-medium">Ixteria</span>
          </div>
          <p className="text-gray-600 text-xs">
            © 2026 Ixteria. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  );
}