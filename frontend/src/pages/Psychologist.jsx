import React, { useState, useEffect } from 'react';

import PsychologistBackground from '../components/PsychologistBackground';

import { X, BookOpen, Brain, Heart, MessageCircle, BarChart3, Smile, ArrowLeft } from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';

import { useLanguage } from '../contexts/LanguageContext';

import { apiClient } from '../utils/apiClient';



const USER_ID = 1;



// ---------- Mood emoji options ----------

const MOOD_OPTIONS = [

  { emoji: '😊', label: 'Отлично', mood: 5, color: 'from-green-400 to-emerald-500' },

  { emoji: '🙂', label: 'Хорошо',  mood: 4, color: 'from-blue-400 to-cyan-500' },

  { emoji: '😐', label: 'Нормально', mood: 3, color: 'from-amber-400 to-yellow-500' },

  { emoji: '😔', label: 'Так себе', mood: 2, color: 'from-orange-400 to-red-500' },

  { emoji: '😢', label: 'Плохо',   mood: 1, color: 'from-red-500 to-pink-500' },

];



const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];



// ---------- Modal component ----------

const InfoModal = ({ isOpen, onClose, title, children, hideButton, footerButton }) => {

  if (!isOpen) return null;

  const showFooter = !hideButton || footerButton;

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">

      <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">

        <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">

          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">

            <BookOpen size={22} className="text-purple-500" />

            {title}

          </h2>

          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0 ml-2">

            <X size={20} className="text-gray-500" />

          </button>

        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-5 text-sm flex-1">

          {children}

        </div>

        {showFooter && (

          <div className="px-6 pb-6 pt-2 flex-shrink-0">

            {footerButton ? footerButton : (

              <button onClick={onClose} className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-[2rem] transition-colors">

                Понятно!

              </button>

            )}

          </div>

        )}

      </div>

    </div>

  );

};



// ---------- Main Page (Dashboard only, no chat) ----------

const Psychologist = () => {

  const navigate = useNavigate();

  const location = useLocation();

const { language, changeLanguage, t } = useLanguage();



  // Info modals

  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const [showStartSession, setShowStartSession] = useState(false);

  const [sessionLoading, setSessionLoading] = useState(false);



  // Mood

  const [selectedMood, setSelectedMood] = useState(null);

  const [moodSaved, setMoodSaved] = useState(false);

  const [moodWeek, setMoodWeek] = useState([]);

  const [savingMood, setSavingMood] = useState(false);



  // Session state (only for knowing if active, to hide/show "Start" card)

  const [activeSessionData, setActiveSessionData] = useState(null);



  // Load on mount

  useEffect(() => {

    loadMoodWeek();

    checkActiveSession();

  }, []);



  // Handle navigation from TherapySessions "Начать сеанс"

  useEffect(() => {

    if (location.state?.openSession) {

      window.history.replaceState({}, document.title);

      startSession();

    }

  }, [location.state]);



  // ─── Check active session ─────────────



  const checkActiveSession = async () => {

    try {

      const res = await apiClient.get(`/api/user/${USER_ID}/therapy/active`);

      if (res.data?.active && res.data?.session) {

        setActiveSessionData(res.data);

      }

    } catch (err) {

      console.error('Failed to check active session:', err);

    }

  };



  // ─── Mood ────────────────────────────



  const loadMoodWeek = async () => {

    try {

      const res = await apiClient.get(`/api/user/${USER_ID}/mood-week`);

      setMoodWeek(res.data || []);

    } catch (err) {

      console.error('Failed to load mood week:', err);

    }

  };



  const handleMoodSelect = async (option, index) => {

    setSelectedMood(index);

    setMoodSaved(false);

    setSavingMood(true);

    try {

      await apiClient.post(`/api/user/${USER_ID}/mood`, {

        mood: option.mood,

        emoji: option.emoji,

        label: option.label,

      });

      setMoodSaved(true);

    } catch (err) {

      console.error('Failed to save mood:', err);

    } finally {

      setSavingMood(false);

    }

  };



  // ─── Start session → ALWAYS create NEW chat → redirect to unified chat ─────────



  const startSession = async () => {

    setShowStartSession(false);

    setSessionLoading(true);



    try {

      // Проверяем, нет ли уже активной сессии — если есть, идём в её чат

      const activeRes = await apiClient.get(`/api/user/${USER_ID}/therapy/active`);

      if (activeRes.data?.active && activeRes.data?.session?.chat_id) {

        navigate(`/chat/${activeRes.data.session.chat_id}`, { state: { activeSession: true } });

        return;

      }



      // Always create a NEW chat for each session (never reuse old one)

      const WELCOME_MSG = `💜 **Здравствуйте, расскажите, что вас беспокоит?**



Я внимательно выслушаю вас и помогу разобраться в ваших переживаниях. Наш разговор строго конфиденциален — вы можете говорить совершенно открыто.



После завершения сеанса я запишу краткое резюме в раздел **«Ваши сеансы терапий и итоги»**, чтобы вы всегда могли вернуться к нашим обсуждениям.



Расскажите, с чего бы вы хотели начать сегодня? 🌿`;



      const createRes = await apiClient.post('/api/chats', {

        user_id: USER_ID,

        title: 'Сеанс психотерапии',

        agent_type: 'psychologist',

        welcome_message: WELCOME_MSG,

      });

      const psyChat = createRes.data;

      const chatId = psyChat.id || psyChat.chat_id;



      // Start therapy session

      await apiClient.post(`/api/user/${USER_ID}/therapy-sessions`, {

        chat_id: chatId,

      });



      // Redirect to unified chat with psychologist agent

      navigate(`/chat/${chatId}`, { state: { activeSession: true } });

    } catch (err) {

      console.error('Failed to start session:', err);

    } finally {

      setSessionLoading(false);

    }

  };



  // ─── Mood week helper ────────────────



  const getMoodWeekData = () => {

    const days = [];

    const today = new Date();

    for (let i = 6; i >= 0; i--) {

      const d = new Date(today);

      d.setDate(d.getDate() - i);

      const dateStr = d.toISOString().split('T')[0];

      const entry = moodWeek.find(e => e.created_at?.startsWith(dateStr));

      days.push({

        label: DAY_LABELS[(d.getDay() + 6) % 7],

        date: dateStr,

        emoji: entry?.emoji || '—',

        mood: entry?.mood || 0,

      });

    }

    return days;

  };



  const weekData = getMoodWeekData();



  // ─── Render: Dashboard only ──────────



  return (

    <div className="flex-1 relative overflow-y-auto px-6 pt-4 pb-8">

      <PsychologistBackground />

      <div className="relative z-10 max-w-2xl mx-auto">


        {/* ===== 3 blocks ===== */}

        <div className="grid grid-cols-3 gap-3 mb-6">

          {/* Block 1: How it works */}

          <button

            onClick={() => setShowHowItWorks(true)}

            className="bg-white dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent"

          >

            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">

              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">

                <Brain size={20} className="text-purple-600 dark:text-purple-400" />

              </div>

              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">

                Как работает психолог?

              </span>

            </div>

          </button>



          {/* Block 2: Therapy sessions */}

          <button

            onClick={() => navigate('/psychologist/sessions')}

            className="bg-white dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent"

          >

            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">

              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">

                <Heart size={20} className="text-blue-600 dark:text-blue-400" />

              </div>

              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">

                Ваши сеансы терапий и итоги

              </span>

            </div>

          </button>



          {/* Block 3: Diary */}

          <button

            onClick={() => navigate('/psychologist/diary')}

            className="bg-white dark:bg-surface-dark rounded-[3rem] p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors aspect-square shadow-sm border border-gray-100 dark:border-transparent"

          >

            <div className="flex flex-col items-center justify-center gap-2 w-full h-full">

              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">

                <BookOpen size={20} className="text-amber-600 dark:text-amber-400" />

              </div>

              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">

                Дневник

              </span>

            </div>

          </button>

        </div>



        {/* ===== Start Session Card (only if no active session) ===== */}

        {!activeSessionData && (

          <button

            onClick={() => setShowStartSession(true)}

            className="w-full bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 rounded-[3rem] p-6 mb-6 text-white text-center hover:shadow-xl transition-all group"

          >

            <div className="flex flex-col items-center gap-3">

              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">

                <MessageCircle size={32} className="text-white" />

              </div>

              <h2 className="text-xl font-semibold">Начните сеанс психотерапии</h2>

              <p className="text-sm text-white/80">

                Психолог выслушает вас и постарается вам помочь.

              </p>

            </div>

          </button>

        )}



        {/* ===== If active session, show hint to go to chat ===== */}

        {activeSessionData && (

          <button

            onClick={() => {

              const chatId = activeSessionData.session?.chat_id;

              if (chatId) navigate(`/chat/${chatId}`);

            }}

            className="w-full bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 rounded-[3rem] p-6 mb-6 text-white text-center hover:shadow-xl transition-all group"

          >

            <div className="flex flex-col items-center gap-3">

              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">

                <MessageCircle size={32} className="text-white" />

              </div>

              <h2 className="text-xl font-semibold">Продолжить текущий сеанс</h2>

              <p className="text-sm text-white/80">

                Вернуться в чат с психологом

              </p>

            </div>

          </button>

        )}



        {/* ===== Mood Scale ===== */}

        <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-5 mb-6">

          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">

            <Smile size={20} className="text-amber-500" />

            Как вы сегодня себя чувствуете?

          </h2>

          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide sm:justify-center -mx-1 px-1">

            {MOOD_OPTIONS.map((option, index) => (

              <button

                key={index}

                onClick={() => handleMoodSelect(option, index)}

                disabled={savingMood}

                className={`flex-shrink-0 min-w-[72px] sm:min-w-[68px] flex flex-col items-center gap-1.5 p-3 sm:p-3 rounded-[2rem] transition-all ${

                  selectedMood === index

                    ? `bg-gradient-to-br ${option.color} text-white shadow-lg ring-2 ring-white/50`

                    : 'bg-white/60 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 border border-gray-200/60 dark:border-white/10'

                }`}

              >

                <span className="text-2xl sm:text-2xl leading-none">{option.emoji}</span>

                <span className="text-[11px] sm:text-[10px] font-medium whitespace-nowrap text-gray-700 dark:text-gray-200">{option.label}</span>

              </button>

            ))}

          </div>

          {moodSaved && (

            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-[2rem] text-center">

              <p className="text-sm text-green-700 dark:text-green-300">

                Настроение записано! Спасибо ✨

              </p>

            </div>

          )}

          {savingMood && (

            <div className="mt-3 p-3 text-center">

              <p className="text-sm text-gray-400">Сохранение...</p>

            </div>

          )}

        </div>



        {/* ===== Mood Week Chart ===== */}

        <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-5 mb-6">

          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">

            <BarChart3 size={20} className="text-purple-500" />

            Настроение за неделю

          </h2>

          <div className="flex justify-between items-end gap-2">

            {weekData.map((day, index) => (

              <div key={index} className="flex flex-col items-center gap-2 flex-1">

                <span className="text-xl">{day.emoji}</span>

                <div

                  className={`w-full rounded-full transition-all ${

                    day.mood > 0

                      ? day.mood >= 4

                        ? 'bg-green-400'

                        : day.mood >= 3

                        ? 'bg-amber-400'

                        : 'bg-red-400'

                      : 'bg-gray-200 dark:bg-gray-700'

                  }`}

                  style={{ height: `${day.mood > 0 ? 20 + day.mood * 12 : 8}px` }}

                />

                <span className="text-[10px] text-gray-500 dark:text-gray-400">{day.label}</span>

              </div>

            ))}

          </div>

          {weekData.every(d => d.mood === 0) && (

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">

              Пока нет данных. Отмечайте своё настроение каждый день!

            </p>

          )}

        </div>



        {/* ===== Quote ===== */}

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 rounded-[3rem] p-6 text-white text-center">

          <p className="text-2xl mb-2">💜</p>

          <p className="text-lg font-medium mb-2">

            «Ты не один. Каждая эмоция — это часть пути, и ты справляешься лучше, чем думаешь.»

          </p>

          <p className="text-sm text-white/70">— Твой психолог</p>

        </div>

      </div>



      {/* ===== Info Modals ===== */}



      {/* Как работает психолог */}

      <InfoModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} title="Как работает психолог?">

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] p-4">

          <div className="flex items-start gap-3">

            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>

            <div>

              <p className="font-semibold text-gray-800 dark:text-white mb-1">Сеанс терапии</p>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">

                Когда вы начинаете сеанс, вы общаетесь с психологом в общем чате — рассказываете

                о своих переживаниях, а психолог задаёт вопросы, помогает разобраться

                в проблемах и найти новые пути решения.

              </p>

            </div>

          </div>

        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] p-4">

          <div className="flex items-start gap-3">

            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>

            <div>

              <p className="font-semibold text-gray-800 dark:text-white mb-1">Саммери сеанса</p>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">

                После каждого сеанса психолог записывает саммери в блок «Ваши сеансы

                терапий и итоги»: описывает ход беседы и предлагает конкретные решения.

              </p>

            </div>

          </div>

        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-4">

          <div className="flex items-start gap-3">

            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>

            <div>

              <p className="font-semibold text-gray-800 dark:text-white mb-1">Шкала настроения</p>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">

                Нажимайте на шкалу настроения каждый раз, когда используете психолога —

                это помогает агенту отслеживать динамику вашего эмоционального состояния.

              </p>

            </div>

          </div>

        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-[2rem] p-4">

          <div className="flex items-start gap-3">

            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>

            <div>

              <p className="font-semibold text-gray-800 dark:text-white mb-1">Формирование выписки</p>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">

                Вы можете получить PDF-выписку с описанием всех ваших сеансов.

              </p>

            </div>

          </div>

        </div>

        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] p-4">

          <div className="flex items-start gap-3">

            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">5</div>

            <div>

              <p className="font-semibold text-gray-800 dark:text-white mb-1">Конфиденциальность</p>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">

                Всё, что вы обсуждаете с психологом, остаётся строго конфиденциальным.

              </p>

            </div>

          </div>

        </div>

      </InfoModal>



      {/* Начните сеанс */}

      <InfoModal

        isOpen={showStartSession}

        onClose={() => setShowStartSession(false)}

        title="Начните сеанс психотерапии"

        footerButton={

          <button

            onClick={startSession}

            disabled={sessionLoading}

            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium rounded-[2rem] transition-all shadow-md disabled:opacity-50"

          >

            {sessionLoading ? 'Начинаем...' : 'Начать сеанс'}

          </button>

        }

      >

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] p-4">

          <div className="flex items-start gap-3">

            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>

            <div>

              <p className="font-semibold text-gray-800 dark:text-white mb-1">Как проходит терапия?</p>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">

                Всё устроено так же, как в жизни — вы общаетесь с психологом в общем чате.

              </p>

            </div>

          </div>

        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] p-4">

          <div className="flex items-start gap-3">

            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>

            <div>

              <p className="font-semibold text-gray-800 dark:text-white mb-1">Запись сеанса</p>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">

                Психолог подводит итоги после окончания сеанса и сохраняет их в раздел «Ваши сеансы терапий и итоги».

              </p>

            </div>

          </div>

        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-[2rem] p-4">

          <div className="flex items-start gap-3">

            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>

            <div>

              <p className="font-semibold text-gray-800 dark:text-white mb-1">Конфиденциальность</p>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">

                Всё, что вы обсуждаете с психологом, остаётся строго конфиденциальным.

              </p>

            </div>

          </div>

        </div>

      </InfoModal>

    </div>

  );

};



export default Psychologist;