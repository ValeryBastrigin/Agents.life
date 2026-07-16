import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// ── Agent icons for floating animation (no ixteria) ──
const AGENT_ICONS = [
  '/assets/icons/agents/секретарь.svg',
  '/assets/icons/agents/диетолог.svg',
  '/assets/icons/agents/психолог.svg',
  '/assets/icons/agents/бухгалтер.svg',
  '/assets/icons/agents/ментор.svg',
];

// ── Blob background colors (matching AnimatedBackground) ──
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

export default function LoginPage({ theme, onLogin }) {
  const colors = theme === 'dark' ? darkColors : lightColors;

  // ── Email OTP state machine ──
  // step: 'buttons' | 'email' | 'code'
  const [step, setStep] = useState('buttons');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [retryAfter, setRetryAfter] = useState(0);

  // Apply theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // ── Handle OAuth callback redirect ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const userData = {
        email: params.get('email'),
        name: params.get('name'),
        google_id: params.get('google_id'),
        picture: params.get('picture'),
        user_id: params.get('user_id'),
      };
      // Clear query params from the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Notify parent
      if (onLogin) onLogin('google', userData);
    }
  }, [onLogin]);

  // ── Countdown for retry-after ──
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  // ── Floating agent icons (bigger on mobile, no ixteria, with duplicates) ──
  // Positions spread across full width on mobile (m: 1%–95%)
  const floatingAgents = [
    // secretar (2 copies)
    { icon: AGENT_ICONS[0], x: { m: '3%', d: '3%' }, y: { m: '2%', d: '12%' }, delay: 0, duration: 7 },
    { icon: AGENT_ICONS[0], x: { m: '88%', d: '78%' }, y: { m: '48%', d: '42%' }, delay: 2.5, duration: 9 },
    // dietolog (2 copies)
    { icon: AGENT_ICONS[1], x: { m: '78%', d: '88%' }, y: { m: '4%', d: '8%' }, delay: 1.5, duration: 8 },
    { icon: AGENT_ICONS[1], x: { m: '1%', d: '12%' }, y: { m: '55%', d: '50%' }, delay: 3.2, duration: 8.5 },
    // psiholog (2 copies)
    { icon: AGENT_ICONS[2], x: { m: '1%', d: '6%' }, y: { m: '80%', d: '68%' }, delay: 0.8, duration: 9 },
    { icon: AGENT_ICONS[2], x: { m: '86%', d: '72%' }, y: { m: '22%', d: '22%' }, delay: 4, duration: 7.5 },
    // buhgalter (2 copies)
    { icon: AGENT_ICONS[3], x: { m: '92%', d: '85%' }, y: { m: '78%', d: '72%' }, delay: 2.2, duration: 7.5 },
    { icon: AGENT_ICONS[3], x: { m: '20%', d: '20%' }, y: { m: '3%', d: '18%' }, delay: 1, duration: 10 },
    // mentor (2 copies)
    { icon: AGENT_ICONS[4], x: { m: '40%', d: '30%' }, y: { m: '88%', d: '82%' }, delay: 0.5, duration: 8.5 },
    { icon: AGENT_ICONS[4], x: { m: '5%', d: '15%' }, y: { m: '20%', d: '30%' }, delay: 3.8, duration: 11 },
  ];

  // ── Extra tiny floating icons ──
  const tinyIcons = [
    { icon: AGENT_ICONS[0], x: { m: '94%', d: '70%' }, y: { m: '65%', d: '60%' }, delay: 1, duration: 11 },
    { icon: AGENT_ICONS[1], x: { m: '15%', d: '25%' }, y: { m: '42%', d: '35%' }, delay: 0.3, duration: 12 },
    { icon: AGENT_ICONS[2], x: { m: '60%', d: '62%' }, y: { m: '10%', d: '28%' }, delay: 2, duration: 10 },
    { icon: AGENT_ICONS[3], x: { m: '35%', d: '38%' }, y: { m: '74%', d: '64%' }, delay: 1.7, duration: 9.5 },
  ];

  // ── Auth handlers ──
  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleAppleLogin = () => {
    if (onLogin) onLogin('apple');
  };

  const handleYandexLogin = () => {
    if (onLogin) onLogin('yandex');
  };

  const handleEmailLogin = () => {
    setStep('email');
    setError('');
    setSuccessMsg('');
    setEmail('');
    setCode('');
    setCodeDigits(['', '', '', '', '', '']);
  };

  // ── OTP: send code ──
  const handleSendCode = async (e) => {
    e && e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Введите корректный email');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const waitSeconds = data.detail?.retry_after_seconds || data.retry_after || 60;
          setRetryAfter(waitSeconds);
          throw new Error(`Повторный запрос возможен через ${waitSeconds} сек.`);
        }
        throw new Error(data.detail || 'Не удалось отправить код');
      }
      setSuccessMsg('Код отправлен на ваш email');
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Input handler for 6-digit code ──
  const handleDigitChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...codeDigits];
    newDigits[index] = value;
    setCodeDigits(newDigits);
    setCode(newDigits.join(''));
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...codeDigits];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newDigits[i] = pasted[i];
    }
    setCodeDigits(newDigits);
    setCode(newDigits.join(''));
    setError('');
    // Focus the next empty or last field
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
    const input = document.getElementById(`otp-digit-${focusIdx}`);
    if (input) input.focus();
  };

  // ── OTP: verify code ──
  const handleVerifyCode = async (e) => {
    e && e.preventDefault();
    const fullCode = codeDigits.join('');
    if (fullCode.length < 6) {
      setError('Введите 6-значный код');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: fullCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429 || res.status === 423) {
          throw new Error(data.detail || 'Слишком много попыток. Попробуйте позже.');
        }
        throw new Error(data.detail || 'Неверный код');
      }
      const data = await res.json();
      // Store token and user info
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_id', String(data.user_id));
      // Trigger login
      if (onLogin) onLogin('email', {
        user_id: data.user_id,
        email: email.trim().toLowerCase(),
        token: data.access_token,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render floating icons ──
  const renderFloatingIcons = () => (
    <>
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
    </>
  );

  return (
    <div className="relative w-full h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
      {/* ── Animated Blobs (matching app background style) ── */}
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
      {renderFloatingIcons()}

      {/* ── Central Login Card ── */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-sm px-6">
        {/* Logo + Title */}
        <motion.div
          className="flex flex-col items-center mb-8 md:mb-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <img
            src="/assets/icons/agents/ixteria.svg"
            alt="Ixteria"
            className="w-24 h-24 md:w-28 md:h-28 mb-4 md:mb-5 drop-shadow-lg"
          />
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
            Ixteria
          </h1>
          <p className="mt-2 md:mt-3 text-xs md:text-base text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-[260px] md:max-w-xs">
            Собери команду ИИ-агентов и упрости себе жизнь
          </p>
        </motion.div>

        {/* ══════════════════════════════════════════ */}
        {/* STEP: Buttons — social login + email */}
        {/* ══════════════════════════════════════════ */}
        {step === 'buttons' && (
          <motion.div
            className="w-full flex flex-col gap-2.5 md:gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          >
            {/* Google */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 md:py-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-200">Войти через Google</span>
            </button>

            {/* Apple */}
            <button
              onClick={handleAppleLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 md:py-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path className="text-gray-900 dark:text-white" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-200">Войти через Apple</span>
            </button>

            {/* Яндекс */}
            <button
              onClick={handleYandexLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 md:py-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#FC3F1D"/>
                <text x="12" y="16" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Я</text>
              </svg>
              <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-200">Войти через Яндекс</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">или</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Email */}
            <button
              onClick={handleEmailLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 md:py-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <Mail size={16} className="md:w-5 md:h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-200">Войти по почте</span>
            </button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* STEP: Email input — ask for email */}
        {/* ══════════════════════════════════════════ */}
        {step === 'email' && (
          <motion.div
            className="w-full flex flex-col gap-3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Back button */}
            <button
              onClick={() => { setStep('buttons'); setError(''); }}
              className="flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors self-start -ml-1 px-2 py-1"
            >
              <ArrowLeft size={16} />
            </button>

            {/* Email field — moved up, no icon/title */}
            <div className="relative mt-2">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="your@email.com"
                autoFocus
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendCode(); }}
              />
            </div>

            {/* Error / Success */}
            {error && (
              <div className="flex items-center gap-1.5 text-red-500 text-xs">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Send code button */}
            <button
              onClick={handleSendCode}
              disabled={loading || !email.trim() || retryAfter > 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Отправка...</>
              ) : retryAfter > 0 ? (
                `Подождите ${retryAfter} сек.`
              ) : (
                'Отправить код'
              )}
            </button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* STEP: Code input — 6-digit OTP */}
        {/* ══════════════════════════════════════════ */}
        {step === 'code' && (
          <motion.div
            className="w-full flex flex-col gap-3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Back button */}
            <button
              onClick={() => { setStep('email'); setError(''); setSuccessMsg(''); setCode(''); setCodeDigits(['', '', '', '', '', '']); }}
              className="flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors self-start -ml-1 px-2 py-1"
            >
              <ArrowLeft size={16} />
            </button>

            {/* Title */}
            <div className="text-center mb-1">
              <div className="mx-auto w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-3">
                <Mail size={26} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Введите код</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                6-значный код отправлен на <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>
              </p>
            </div>

            {/* Success message */}
            {successMsg && (
              <div className="flex items-center gap-1.5 text-emerald-500 text-xs justify-center">
                <CheckCircle2 size={14} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 6-digit code inputs */}
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {codeDigits.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  autoFocus={i === 0}
                  className="w-12 h-14 md:w-14 md:h-16 text-center text-xl font-bold rounded-xl bg-white dark:bg-surface-dark border-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-1.5 text-red-500 text-xs text-center justify-center">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Verify button */}
            <button
              onClick={handleVerifyCode}
              disabled={loading || code.length < 6}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Проверка...</>
              ) : (
                'Войти'
              )}
            </button>

            {/* Resend */}
            <button
              onClick={() => { setStep('email'); setError(''); setSuccessMsg(''); setCode(''); setCodeDigits(['', '', '', '', '', '']); }}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-purple-500 transition-colors text-center"
            >
              Отправить код повторно
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          className="mt-6 md:mt-8 text-[10px] md:text-xs text-gray-400 dark:text-gray-500 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Продолжая, вы соглашаетесь с условиями использования
        </motion.p>
      </div>
    </div>
  );
}