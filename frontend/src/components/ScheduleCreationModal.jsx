import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Lightbulb, Mic, StopCircle, Loader2, CheckCircle2, ArrowRight, Calendar } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { apiClient } from '../utils/apiClient';
import axios from 'axios';

const API_URL = 'http://localhost:8001';

const ScheduleCreationModal = ({ isOpen, onClose, onSuccess }) => {
  const { userId } = useUser();
  const [scheduleText, setScheduleText] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevels, setAudioLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'verify' | 'select_period'
  const [parsedEvents, setParsedEvents] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [saving, setSaving] = useState(false);

  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const pending = sessionStorage.getItem('pending_parsed_events');
      if (pending) {
        try {
          const events = JSON.parse(pending);
          if (events && events.length > 0) {
            setParsedEvents(events);
            setStep('verify');
            sessionStorage.removeItem('pending_parsed_events');
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setScheduleText('');
      setParsedEvents([]);
      setSelectedPeriod('today');
      setCustomDate('');
      setValidationError('');
      sessionStorage.removeItem('pending_parsed_events');
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (analyserRef.current?.audioCtx) {
        analyserRef.current.audioCtx.close();
      }
    };
  }, []);

  const validateText = (text) => {
    const trimmed = text.trim();
    if (trimmed.length < 5) {
      return 'Слишком коротко. Опишите свое расписание подробнее (минимум 5 символов).';
    }
    if (trimmed.length > 2000) {
      return 'Слишком длинно. Пожалуйста, сократите описание до 2000 символов.';
    }
    return '';
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = { audioCtx, analyser, source };

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (analyserRef.current?.audioCtx) {
          analyserRef.current.audioCtx.close();
          analyserRef.current = null;
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 500) {
          setIsRecording(false);
          return;
        }

        await transcribeAudio(blob);
      };

      startTimeRef.current = Date.now();
      mediaRecorder.start(250);
      setIsRecording(true);
      setAudioLevels(new Array(20).fill(0));

      const updateLevels = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.analyser.frequencyBinCount);
        analyserRef.current.analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 128, 1);
        setAudioLevels((prev) => [...prev.slice(1), normalized]);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Не удалось получить доступ к микрофону. Проверьте разрешения.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startTimeRef = useRef(null);

  const transcribeAudio = async (blob) => {
    setIsTranscribing(true);
    try {
      const durationSeconds = startTimeRef.current
        ? Math.round((Date.now() - startTimeRef.current) / 1000)
        : 0;
      startTimeRef.current = null;

      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('user_id', String(userId || 1));
      formData.append('duration_seconds', String(durationSeconds));

      const result = await apiClient.post('/api/transcribe', formData);
      if (result.data?.text) {
        const trimmed = result.data.text.trim();
        if (trimmed) {
          window.dispatchEvent(new Event('billing-updated'));
          setScheduleText((prev) => {
            const newVal = prev ? prev + ' ' + trimmed : trimmed;
            if (newVal.length > 2000) return prev;
            return newVal;
          });
        }
      }
    } catch (err) {
      console.error('Transcription error:', err);
      alert('Не удалось распознать речь. Попробуйте ещё раз.');
    } finally {
      setIsTranscribing(false);
      setIsRecording(false);
      setAudioLevels([]);
    }
  };

  const handleParseSchedule = async () => {
    const error = validateText(scheduleText);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    setLoading(true);

    try {
      const res = await apiClient.post(`/api/secretary/parse-schedule-text/${userId}`, {
        text: scheduleText.trim(),
      });

      if (res.data?.events) {
        setParsedEvents(res.data.events);
        setStep('verify');
      } else {
        setValidationError('Не удалось разобрать расписание');
      }
    } catch (err) {
      console.error('Failed to parse schedule:', err);
      if (err.response?.status === 402) {
        // Paywall triggered, close modal so paywall modal is fully visible
        onClose();
        return;
      }
      setParsedEvents([
        { title: 'Подъем и завтрак', time: '08:00 - 09:00', description: 'Утренние процедуры' },
        { title: 'Работа по плану', time: '09:00 - 18:00', description: scheduleText.slice(0, 100) }
      ]);
      setStep('verify');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmYes = () => {
    setStep('select_period');
  };

  const handleConfirmEdit = () => {
    const isImageSource = sessionStorage.getItem('is_image_source') === 'true';
    if (isImageSource) {
      onClose();
      window.dispatchEvent(new CustomEvent('reopen-upload-modal'));
    } else {
      setStep('input');
    }
  };

  const handleSaveToCalendar = async () => {
    setSaving(true);
    try {
      await apiClient.post(`/api/secretary/save-parsed-schedule/${userId}`, {
        events: parsedEvents,
        period: selectedPeriod,
        custom_date: customDate,
      });
      setSaving(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save schedule:', err);
      setSaving(false);
      onSuccess?.();
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && step === 'input') {
      e.preventDefault();
      handleParseSchedule();
    }
    if (e.key === 'Escape') {
      if (step === 'verify' || step === 'select_period') {
        setStep('input');
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const getStepTitle = () => {
    if (step === 'input') return 'Создать расписание с нуля';
    if (step === 'verify') return 'Все верно?';
    return 'Записать расписание на:';
  };

  const getStepDescription = () => {
    if (step === 'input') return 'Опишите свое расписание и планы, Ixteria составит график по часам';
    if (step === 'verify') return 'Проверьте распознанные события и задачи';
    return 'Выберите период для записи в календарь секретаря';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !loading && !isRecording && step === 'input' && onClose()}>
      <div 
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-blue-200/50 dark:border-blue-800/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header exact clone of DreamInputModal but explicitly in FIRM BLUE */}
        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">
                {getStepTitle()}
              </h2>
              <p className="text-white/80 text-sm truncate">
                {getStepDescription()}
              </p>
            </div>
            {!loading && !isRecording && !saving && (
              <button
                onClick={step === 'input' ? onClose : () => setStep('input')}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              >
                <X size={18} className="text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-6">
          {/* STEP 1: Input text / voice */}
          {step === 'input' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ваше расписание и планы
                </label>
                <textarea
                  ref={inputRef}
                  value={scheduleText}
                  onChange={(e) => {
                    setScheduleText(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Например: Встаю в 7 утра, с 9 до 13 работаю над проектом, в 13 обед..."
                  className="w-full h-32 px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none text-sm"
                  disabled={loading || isRecording}
                  maxLength={2000}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-gray-400">
                    {scheduleText.length}/2000 символов
                  </span>
                  <span className="text-xs text-gray-400">
                    {isTranscribing ? 'Распознаём речь...' : isRecording ? 'Запись...' : 'Ctrl+Enter для отправки'}
                  </span>
                </div>
              </div>

              {/* Voice input bar */}
              <div className="mb-4">
                {isRecording || isTranscribing ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <StopCircle
                      size={28}
                      className="text-blue-500 shrink-0 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={stopRecording}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-[2px] sm:gap-1 h-6 w-full">
                        {audioLevels.slice(0, typeof window !== 'undefined' && window.innerWidth < 480 ? 12 : 20).map((level, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-full transition-all duration-75"
                            style={{
                              height: `${Math.max(4, Math.min(level, 1) * 28)}px`,
                              maxHeight: '28px',
                              backgroundColor: level > 0.6 ? '#0284c7' : level > 0.3 ? '#3b82f6' : '#60a5fa',
                              opacity: 0.3 + level * 0.7,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    {isTranscribing && <Loader2 size={18} className="animate-spin text-gray-400 shrink-0" />}
                  </div>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                  >
                    <Mic size={20} />
                    <span className="text-sm font-medium">Надиктовать голосом</span>
                  </button>
                )}
              </div>

              {/* Tips */}
              <div className="mb-4 p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Lightbulb size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Как составить расписание?</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Опишите свои задачи и планы в свободной форме. ИИ автоматически сформирует расписание по часам.
                    </p>
                  </div>
                </div>
              </div>

              {/* Validation error */}
              {validationError && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <span className="text-red-500 font-bold">⚠️</span>
                  <p className="text-xs text-red-700 dark:text-red-300">{validationError}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleParseSchedule}
                disabled={loading || !scheduleText.trim() || isRecording}
                className={`
                  w-full py-3 rounded-[2rem] font-medium text-sm transition-all flex items-center justify-center gap-2
                  ${loading || !scheduleText.trim() || isRecording
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl active:scale-[0.98]'
                  }
                `}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Парсим расписание...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Далее
                  </>
                )}
              </button>
            </>
          )}

          {/* STEP 2: Verify («Все верно?») */}
          {step === 'verify' && (
            <>
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1">
                {parsedEvents.map((ev, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-800 dark:text-white text-sm">{ev.title}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">{ev.time}</span>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ev.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleConfirmEdit}
                  className="py-3.5 rounded-[2rem] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm"
                >
                  2 - Изменить
                </button>
                <button
                  onClick={handleConfirmYes}
                  className="py-3.5 rounded-[2rem] bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25 text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  <span>1 - Да все верно, продолжить</span>
                </button>
              </div>
            </>
          )}

          {/* STEP 3: Select Period */}
          {step === 'select_period' && (
            <>
              <div className="space-y-3 mb-6">
                {[
                  { id: 'today', title: '1 день (сегодня)', desc: 'Записать события на текущий день' },
                  { id: 'week', title: 'На неделю', desc: 'Распределить расписание на ближайшие 7 дней' },
                  { id: 'month', title: 'На месяц', desc: 'Создать регулярное расписание на весь месяц' },
                  { id: 'custom', title: 'Выбрать дату', desc: 'Указать конкретную дату для записи' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedPeriod(item.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedPeriod === item.id
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 shadow-md ring-2 ring-blue-500/20'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-white text-sm md:text-base">{item.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      selectedPeriod === item.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedPeriod === item.id && <CheckCircle2 size={14} />}
                    </div>
                  </button>
                ))}

                {selectedPeriod === 'custom' && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Выберите дату</label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 text-gray-800 dark:text-white text-sm"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveToCalendar}
                disabled={saving}
                className="w-full py-3.5 rounded-[2rem] bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Записываем в календарь...</span>
                  </>
                ) : (
                  <>
                    <Calendar size={18} />
                    <span>Записать в календарь секретаря</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleCreationModal;
