import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, X } from 'lucide-react';

// ── Agent icons for floating animation ──
const AGENT_ICONS = [
  '/assets/icons/agents/секретарь.svg',
  '/assets/icons/agents/диетолог.svg',
  '/assets/icons/agents/психолог.svg',
  '/assets/icons/agents/бухгалтер.svg',
  '/assets/icons/agents/ментор.svg',
];

const darkColors = [
  'rgba(37, 99, 235, 0.25)',
  'rgba(22, 163, 74, 0.25)',
  'rgba(219, 39, 119, 0.25)',
  'rgba(147, 51, 234, 0.25)',
  'rgba(217, 119, 6, 0.3)',
];
const lightColors = [
  'rgba(191, 219, 254, 0.4)',
  'rgba(187, 247, 208, 0.4)',
  'rgba(252, 231, 243, 0.4)',
  'rgba(243, 232, 255, 0.4)',
  'rgba(254, 243, 199, 0.45)',
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

export default function TermsWall({ theme, onDecline, onAccept, userId, userProfile }) {
  const loc = useLocation();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const [name, setName] = useState(userProfile?.username || '');
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(null); // 'offer' | 'privacy' | null

  // Apply theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Не рендерим TermsWall на подстраницах /terms/offer и /terms/privacy,
  // иначе fixed overlay перекрывает контент
  if (loc.pathname !== '/terms') return null;

  // ── Floating agent icons ──
  const floatingAgents = [
    { icon: AGENT_ICONS[0], x: { m: '3%', d: '3%' }, y: { m: '2%', d: '12%' }, delay: 0, duration: 7 },
    { icon: AGENT_ICONS[0], x: { m: '88%', d: '78%' }, y: { m: '48%', d: '42%' }, delay: 2.5, duration: 9 },
    { icon: AGENT_ICONS[1], x: { m: '78%', d: '88%' }, y: { m: '4%', d: '8%' }, delay: 1.5, duration: 8 },
    { icon: AGENT_ICONS[1], x: { m: '1%', d: '12%' }, y: { m: '55%', d: '50%' }, delay: 3.2, duration: 8.5 },
    { icon: AGENT_ICONS[2], x: { m: '1%', d: '6%' }, y: { m: '80%', d: '68%' }, delay: 0.8, duration: 9 },
    { icon: AGENT_ICONS[2], x: { m: '86%', d: '72%' }, y: { m: '22%', d: '22%' }, delay: 4, duration: 7.5 },
    { icon: AGENT_ICONS[3], x: { m: '92%', d: '85%' }, y: { m: '78%', d: '72%' }, delay: 2.2, duration: 7.5 },
    { icon: AGENT_ICONS[3], x: { m: '20%', d: '20%' }, y: { m: '3%', d: '18%' }, delay: 1, duration: 10 },
    { icon: AGENT_ICONS[4], x: { m: '40%', d: '30%' }, y: { m: '88%', d: '82%' }, delay: 0.5, duration: 8.5 },
    { icon: AGENT_ICONS[4], x: { m: '5%', d: '15%' }, y: { m: '20%', d: '30%' }, delay: 3.8, duration: 11 },
  ];

  const tinyIcons = [
    { icon: AGENT_ICONS[0], x: { m: '94%', d: '70%' }, y: { m: '65%', d: '60%' }, delay: 1, duration: 11 },
    { icon: AGENT_ICONS[1], x: { m: '15%', d: '25%' }, y: { m: '42%', d: '35%' }, delay: 0.3, duration: 12 },
    { icon: AGENT_ICONS[2], x: { m: '60%', d: '62%' }, y: { m: '10%', d: '28%' }, delay: 2, duration: 10 },
    { icon: AGENT_ICONS[3], x: { m: '35%', d: '38%' }, y: { m: '74%', d: '64%' }, delay: 1.7, duration: 9.5 },
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Пожалуйста, введите ваше имя');
      return;
    }
    if (!offerAccepted || !privacyAccepted) {
      setError('Пожалуйста, примите условия Оферты и Политики конфиденциальности');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/user/${userId}/accept-terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, username: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Ошибка при сохранении условий');
      }

      const data = await res.json();
      if (onAccept) onAccept(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background-light dark:bg-background-dark flex items-center justify-center overflow-hidden">
      {/* ── Animated Blobs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {colors.map((color, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: theme === 'dark' ? [400, 350, 300, 280, 320][i] : [350, 300, 250, 230, 270][i],
              height: theme === 'dark' ? [400, 350, 300, 280, 320][i] : [350, 300, 250, 230, 270][i],
              backgroundColor: color,
              filter: theme === 'dark' ? 'blur(48px)' : 'blur(32px)',
            }}
            initial={{
              x: ['-20%', '80%', '30%', '70%', '10%'][i],
              y: ['-10%', '20%', '80%', '70%', '50%'][i],
              scale: 1,
              rotate: 0,
            }}
            animate={{
              x: ['25%', '45%', '55%', '35%', '65%'][i],
              y: ['15%', '55%', '35%', '45%', '20%'][i],
              scale: [1.2, 0.8, 1.3, 0.9, 1.1][i],
              rotate: [90, -90, 120, -120, 60][i],
            }}
            transition={{
              duration: [14, 16, 15, 18, 15.5][i],
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* ── Floating Agent Icons ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <style>{`
          @media (min-width: 768px) {
            ${[0,1,2,3,4,5,6,7,8,9].map(i => `
              [data-float="${i}"] { left: ${floatingAgents[i].x.d} !important; top: ${floatingAgents[i].y.d} !important; }
            `).join('')}
            ${[0,1,2,3].map(i => `
              [data-tiny="${i}"] { left: ${tinyIcons[i].x.d} !important; top: ${tinyIcons[i].y.d} !important; }
            `).join('')}
          }
        `}</style>

        {floatingAgents.map((agent, i) => (
          <motion.div
            key={`big-${i}`}
            data-float={i}
            className="absolute pointer-events-none z-10"
            style={{ left: agent.x.m, top: agent.y.m }}
            initial={{ y: 0, rotate: 0, opacity: 0.5 }}
            animate={{ y: [0, -10, 0, 7, 0], rotate: [0, 6, -3, 3, 0], opacity: [0.5, 0.8, 0.6, 0.75, 0.5] }}
            transition={{ duration: agent.duration, delay: agent.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img src={agent.icon} alt="agent" className="w-14 h-14 md:w-14 md:h-14 opacity-50 dark:opacity-40 md:opacity-70 md:dark:opacity-60" />
          </motion.div>
        ))}

        {tinyIcons.map((icon, i) => (
          <motion.div
            key={`tiny-${i}`}
            data-tiny={i}
            className="absolute pointer-events-none z-10"
            style={{ left: icon.x.m, top: icon.y.m }}
            initial={{ y: 0, opacity: 0.3 }}
            animate={{ y: [0, -8, 0, 6, 0], opacity: [0.3, 0.55, 0.4, 0.5, 0.3] }}
            transition={{ duration: icon.duration, delay: icon.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img src={icon.icon} alt="" className="w-10 h-10 md:w-9 md:h-9 opacity-45 dark:opacity-35 md:opacity-45 md:dark:opacity-35" />
          </motion.div>
        ))}
      </div>

      {/* ── Central Card ── */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-sm px-6">
        {/* Logo + Title */}
        <motion.div
          className="flex flex-col items-center mb-6 md:mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <img
            src="/assets/icons/agents/ixteria.svg"
            alt="Ixteria"
            className="w-20 h-20 md:w-24 md:h-24 mb-3 md:mb-4 drop-shadow-lg"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Добро пожаловать!
          </h1>
          <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-[260px] md:max-w-xs">
            Чтобы продолжить, примите условия использования
          </p>
        </motion.div>

        <motion.div
          className="w-full flex flex-col gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          {/* ── Name field ── */}
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Введите ваше имя"
              autoFocus
              className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter' && offerAccepted && privacyAccepted) handleSubmit(); }}
            />
          </div>

          {/* ── Checkboxes ── */}
          <label className="flex items-start gap-3 px-1 cursor-pointer group">
            <input
              type="checkbox"
              checked={offerAccepted}
              onChange={(e) => { setOfferAccepted(e.target.checked); setError(''); }}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300 select-none group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">
              Нажимая на нее вы соглашаетесь с{' '}
              <button
                type="button"
                onClick={() => setShowModal('offer')}
                className="inline text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 underline underline-offset-2 font-medium"
              >
                Офертой
              </button>
            </span>
          </label>

          <label className="flex items-start gap-3 px-1 cursor-pointer group">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => { setPrivacyAccepted(e.target.checked); setError(''); }}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300 select-none group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">
              Нажимая на нее вы соглашаетесь с{' '}
              <button
                type="button"
                onClick={() => setShowModal('privacy')}
                className="inline text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 underline underline-offset-2 font-medium"
              >
                политикой конфиденциальности
              </button>
            </span>
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-1.5 text-red-500 text-xs">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Buttons ── */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={onDecline}
              className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !offerAccepted || !privacyAccepted}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Сохранение...</>
              ) : (
                <>Далее <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Modal for Offer / Privacy text ── */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg bg-background-light dark:bg-background-dark rounded-[2rem] shadow-2xl flex flex-col max-h-[80vh] animate-fade-in">
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {showModal === 'offer' ? 'Оферта' : 'Политика конфиденциальности'}
              </h2>
              <button onClick={() => setShowModal(null)} className="p-2 hover:bg-surface-light dark:hover:bg-surface-dark rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="px-6 pb-6 overflow-y-auto text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-4">
              {showModal === 'offer' ? (
                <>
                  <p>1. Общие положения</p>
                  <p>Настоящее Соглашение определяет условия использования Сервиса Ixteria. Используя Сервис, Пользователь подтверждает свое согласие с условиями настоящей Оферты.</p>
                  <p>2. Предмет Соглашения</p>
                  <p>Предметом настоящего Соглашения является предоставление Пользователю доступа к функциональным возможностям Сервиса, включая использование AI-ассистентов (секретарь, диетолог, психолог, ментор, бухгалтер) и связанных с ними сервисов.</p>
                  <p>3. Права и обязанности сторон</p>
                  <p>Пользователь обязуется не передавать свои учетные данные третьим лицам, не использовать Сервис для противоправной деятельности, соблюдать права интеллектуальной собственности.</p>
                  <p>4. Конфиденциальность</p>
                  <p>Стороны обязуются соблюдать конфиденциальность информации, полученной в рамках использования Сервиса, за исключением случаев, предусмотренных законодательством.</p>
                  <p className="text-gray-400 italic mt-6">* Данный текст является заглушкой для демонстрации</p>
                </>
              ) : (
                <>
                  <p>1. Общие положения</p>
                  <p>Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей Сервиса Ixteria.</p>
                  <p>2. Сбор информации</p>
                  <p>Сервис собирает минимально необходимую информацию для предоставления функциональных возможностей: имя пользователя, адрес электронной почты, данные профиля.</p>
                  <p>3. Использование информации</p>
                  <p>Собранная информация используется исключительно для целей функционирования Сервиса, персонализации контента и улучшения качества предоставляемых услуг.</p>
                  <p>4. Защита данных</p>
                  <p>Сервис принимает все необходимые организационные и технические меры для защиты персональных данных пользователей от несанкционированного доступа, изменения, раскрытия или уничтожения.</p>
                  <p>5. Передача данных третьим лицам</p>
                  <p>Персональные данные пользователей не передаются третьим лицам, за исключением случаев, предусмотренных законодательством.</p>
                  <p className="text-gray-400 italic mt-6">* Данный текст является заглушкой для демонстрации</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
