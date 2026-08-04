import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Loader2, ChevronLeft, ChevronRight, Activity, Clock, AlertTriangle, Lightbulb, Trophy } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { apiClient } from '../utils/apiClient';

const ScheduleAnalysisModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null); // Parsed JSON or raw text
  const [rawAnalysisText, setRawAnalysisText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadCalendarData();
    } else {
      setStartDate(null);
      setEndDate(null);
      setAnalysisResult(null);
    }
  }, [isOpen, userId]);

  const loadCalendarData = async () => {
    setLoadingData(true);
    try {
      const [eventsRes, remindersRes] = await Promise.all([
        apiClient.get(`/api/events/${userId}`),
        apiClient.get(`/api/reminders/${userId}`)
      ]);
      setEvents(eventsRes.data || []);
      setReminders(remindersRes.data || []);
    } catch (err) {
      console.error('Failed to load calendar data for analysis:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const getDateStatus = (dateStr) => {
    const hasEvents = events.some(e => {
      const eDate = e.start ? e.start.split('T')[0] : '';
      return eDate === dateStr;
    });
    const hasReminders = reminders.some(r => {
      return r.date === dateStr;
    });
    return { hasEvents, hasReminders };
  };

  const handleDateClick = (dateStr) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (dateStr < startDate) {
        setStartDate(dateStr);
      } else {
        setEndDate(dateStr);
      }
    }
  };

  const isDateSelected = (dateStr) => {
    if (startDate && !endDate) return dateStr === startDate;
    if (startDate && endDate) return dateStr >= startDate && dateStr <= endDate;
    return false;
  };

  const handleAnalyze = async () => {
    if (!startDate) return;
    const finalStart = startDate;
    const finalEnd = endDate || startDate;

    setAnalyzing(true);
    setAnalysisResult(null);
    setRawAnalysisText('');
    try {
      const res = await apiClient.post(`/api/secretary/analyze-schedule-range/${userId}`, {
        start_date: finalStart,
        end_date: finalEnd
      });
      window.dispatchEvent(new Event('billing-updated'));
      const text = res.data?.analysis || '';
      setRawAnalysisText(text);
      
      // Try to parse structured blocks or fallback to clean formatting
      setAnalysisResult(parseAnalysisText(text));
    } catch (err) {
      console.error('Analysis error:', err);
      if (err.response?.status === 402) {
        onClose();
        return;
      }
      setAnalysisResult({
        general: err.response?.data?.detail || 'Не удалось выполнить анализ расписания. Попробуйте еще раз.'
      });
      setRawAnalysisText('Ошибка анализа');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!rawAnalysisText) return;
    setSaving(true);
    try {
      const finalStart = startDate;
      const finalEnd = endDate || startDate;
      await apiClient.post(`/api/secretary/save-analysis/${userId}`, {
        analysis_data: rawAnalysisText,
        start_date: finalStart,
        end_date: finalEnd
      });
      onClose();
      navigate('/secretary');
    } catch (err) {
      console.error('Failed to save schedule analysis:', err);
    } finally {
      setSaving(false);
    }
  };

  const parseAnalysisText = (rawText) => {
    // Clean up markdown bold/stars if needed and split into logical sections
    const cleaned = rawText.replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '');
    
    // We can categorize paragraphs into blocks
    const sections = {
      general: '',
      balance: '',
      overloads: '',
      tips: [],
      motivation: ''
    };

    const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
    let currentKey = 'general';
    let tipsList = [];

    for (let line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('оценка') || lower.includes('график выглядит')) {
        currentKey = 'general';
        sections.general += ' ' + line.replace(/^(общая оценка графика:|оценка графика:)\s*/i, '');
      } else if (lower.includes('баланс') || lower.includes('работа и отдых')) {
        currentKey = 'balance';
        sections.balance += ' ' + line.replace(/^(баланс работы и отдыха:|баланс:)\s*/i, '');
      } else if (lower.includes('перегрузк') || lower.includes('напряжен')) {
        currentKey = 'overloads';
        sections.overloads += ' ' + line.replace(/^(наличие перегрузок:|перегрузки:)\s*/i, '');
      } else if (lower.includes('совет') || lower.includes('рекомендац') || lower.includes('тайм-менеджмент')) {
        currentKey = 'tips';
      } else if (lower.includes('мотивац') || lower.includes('успехов') || lower.includes('продолжайте')) {
        currentKey = 'motivation';
        sections.motivation += ' ' + line;
      } else {
        if (currentKey === 'tips') {
          // Clean number bullets like "1. "
          const tipText = line.replace(/^\d+[\.\)]\s*/, '');
          if (tipText) tipsList.push(tipText);
        } else if (sections[currentKey]) {
          sections[currentKey] += ' ' + line;
        } else {
          sections[currentKey] = line;
        }
      }
    }

    sections.tips = tipsList.length > 0 ? tipsList : [cleaned];
    if (!sections.general) sections.general = cleaned;
    
    return sections;
  };

  if (!isOpen) return null;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysInMonth = lastDayOfMonth.getDate();
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const calendarCells = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    calendarCells.push(dateStr);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-blue-200/50 dark:border-blue-800/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Анализ расписания с ИИ</h2>
              <p className="text-white/80 text-sm mt-0.5">Выберите дату или диапазон в календаре для рецензии</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {analysisResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={22} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">Рецензия ИИ-секретаря</h3>
              </div>

              {/* Block 1: General Assessment */}
              {analysisResult.general && (
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                  <Activity size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Общая оценка</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{analysisResult.general}</p>
                  </div>
                </div>
              )}

              {/* Block 2: Work & Rest Balance */}
              {analysisResult.balance && (
                <div className="p-4 rounded-2xl bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 flex items-start gap-3">
                  <Clock size={20} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Баланс работы и отдыха</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{analysisResult.balance}</p>
                  </div>
                </div>
              )}

              {/* Block 3: Overloads */}
              {analysisResult.overloads && (
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Перегрузки и напряжение</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{analysisResult.overloads}</p>
                  </div>
                </div>
              )}

              {/* Block 4: Tips */}
              {analysisResult.tips && analysisResult.tips.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                  <Lightbulb size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-2">Советы по тайм-менеджменту</h4>
                    <ul className="space-y-1.5">
                      {analysisResult.tips.map((tip, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2">
                          <span className="font-bold text-indigo-500">•</span>
                          <span className="leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Block 5: Motivation */}
              {analysisResult.motivation && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                  <Trophy size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Мотивация</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{analysisResult.motivation}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="flex-1 py-3.5 rounded-[2rem] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm"
                >
                  Другие даты
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-[2rem] bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <span>Сохранить в виджет</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">
                  {monthNames[month]} {year}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400">
                <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.map((dateStr, idx) => {
                  if (!dateStr) {
                    return <div key={`empty-${idx}`} className="h-12 md:h-14" />;
                  }

                  const { hasEvents, hasReminders } = getDateStatus(dateStr);
                  const selected = isDateSelected(dateStr);
                  const dayNum = parseInt(dateStr.split('-')[2], 10);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDateClick(dateStr)}
                      className={`h-12 md:h-14 rounded-2xl flex flex-col items-center justify-center relative transition-all border ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                          : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-gray-200 dark:border-gray-700/60 text-gray-800 dark:text-white'
                      }`}
                    >
                      <span className="text-sm font-semibold">{dayNum}</span>
                      
                      {/* Indicators */}
                      <div className="flex items-center gap-1 mt-1">
                        {hasEvents && (
                          <div className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-amber-300' : 'bg-amber-500'}`} title="Есть расписание" />
                        )}
                        {hasReminders && (
                          <div className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-cyan-200' : 'bg-blue-500'}`} title="Есть напоминания" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend for UX */}
              <div className="flex items-center justify-center gap-6 py-2 px-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Расписание</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Напоминания</span>
                </div>
              </div>

              {/* Selection summary & Submit */}
              <div className="pt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
                  {startDate && endDate
                    ? `Выбран период: с ${startDate} по ${endDate}`
                    : startDate
                    ? `Выбрана дата: ${startDate} (нажмите вторую дату для диапазона)`
                    : 'Нажмите на дату в календаре для анализа'}
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={!startDate || analyzing}
                  className={`w-full py-3.5 rounded-[2rem] font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    !startDate || analyzing
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl active:scale-[0.98]'
                  }`}
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Анализируем график...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Проанализировать расписание</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleAnalysisModal;
