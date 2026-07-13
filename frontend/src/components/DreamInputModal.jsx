import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, AlertTriangle, Lightbulb, Mic, StopCircle, Loader2, CheckCircle2, ArrowRight, MessageSquare, ChevronRight } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

const DreamInputModal = ({ isOpen, onClose }) => {
  const [dream, setDream] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevels, setAudioLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'select_goal' | 'select_steps'
  const [goals, setGoals] = useState([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState(new Set()); // <-- Set of selected goal IDs
  const [selectedStepsByGoal, setSelectedStepsByGoal] = useState({}); // { goalId: [stepIds] }
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset when closing
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setDream('');
      setGoals([]);
      setSelectedGoalIds(new Set());
      setSelectedStepsByGoal({});
      setValidationError('');
    }
  }, [isOpen]);

  // Cleanup on unmount
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

  // Validate dream before submission
  const validateDream = (text) => {
    const trimmed = text.trim();
    
    if (trimmed.length < 10) {
      return 'Слишком коротко. Опишите свою мечту подробнее (минимум 10 символов).';
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

      mediaRecorder.start(250);
      setIsRecording(true);
      setAudioLevels(new Array(20).fill(0));

      const updateLevels = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.analyser.frequencyBinCount);
        analyserRef.current.analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 128, 1);
        setAudioLevels((prev) => {
          const next = [...prev.slice(1), normalized];
          return next;
        });
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

  const transcribeAudio = async (blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      const result = await apiClient.post('/api/transcribe', formData);
      if (result.data?.text) {
        const trimmed = result.data.text.trim();
        if (trimmed) {
          setDream((prev) => {
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

  const handleSubmitDream = async () => {
    const error = validateDream(dream);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    setLoading(true);

    try {
      const res = await apiClient.post('/api/mentor/analyze-dream-steps', {
        dream: dream.trim(),
        user_id: 1
      });

      if (res.data?.success && res.data?.goals?.length > 0) {
        setGoals(res.data.goals);
        setStep('select_goal');
      } else {
        setValidationError(res.data?.error || 'Не удалось проанализировать мечту');
      }
    } catch (err) {
      console.error('Failed to analyze dream:', err);
      setValidationError('Ошибка соединения. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection of a goal (multiple allowed)
  const toggleGoalSelection = (goalId) => {
    setSelectedGoalIds(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
        // Also clear steps for this goal
        setSelectedStepsByGoal(s => {
          const sNext = { ...s };
          delete sNext[goalId];
          return sNext;
        });
      } else {
        next.add(goalId);
        // Auto-select first 3 steps for this goal
        const goal = goals.find(g => g.goal_id === goalId);
        if (goal?.steps?.length > 0) {
          setSelectedStepsByGoal(s => ({
            ...s,
            [goalId]: goal.steps.slice(0, 3).map(st => st.id)
          }));
        }
      }
      return next;
    });
  };

  // Go to step 3: show steps for all selected goals
  const handleContinueToSteps = () => {
    if (selectedGoalIds.size === 0) {
      setValidationError('Выберите хотя бы одно направление');
      return;
    }
    setValidationError('');
    setStep('select_steps');
  };

  // Toggle a step within a goal
  const toggleStep = (goalId, stepId) => {
    setSelectedStepsByGoal(prev => {
      const currentSteps = prev[goalId] || [];
      let newSteps;
      if (currentSteps.includes(stepId)) {
        newSteps = currentSteps.filter(id => id !== stepId);
      } else {
        if (currentSteps.length >= 5) return prev; // max 5 per goal
        newSteps = [...currentSteps, stepId];
      }
      return { ...prev, [goalId]: newSteps };
    });
  };

  const handleConfirmSteps = async () => {
    // Build selections array
    const selections = [];
    let totalSteps = 0;
    for (const goalId of selectedGoalIds) {
      const steps = selectedStepsByGoal[goalId] || [];
      if (steps.length > 0) {
        selections.push({ goal_id: goalId, selected_ids: steps });
        totalSteps += steps.length;
      }
    }

    if (selections.length === 0 || totalSteps === 0) {
      setValidationError('Выберите хотя бы один шаг');
      return;
    }

    setSaving(true);

    try {
      const res = await apiClient.post('/api/mentor/select-multi-steps', {
        selections,
        user_id: 1
      });

      if (res.data?.success) {
        onClose();
      } else {
        setValidationError(res.data?.error || 'Не удалось сохранить выбор');
        setSaving(false);
      }
    } catch (err) {
      console.error('Failed to select steps:', err);
      setValidationError('Ошибка соединения.');
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 'select_steps') {
      setStep('select_goal');
    } else if (step === 'select_goal') {
      setStep('input');
      setGoals([]);
      setSelectedGoalIds(new Set());
      setSelectedStepsByGoal({});
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && step === 'input') {
      e.preventDefault();
      handleSubmitDream();
    }
    if (e.key === 'Escape') {
      if (step === 'select_goal' || step === 'select_steps') {
        handleBack();
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const categoryEmojis = {
    MATERIAL_ASSET: '💰',
    SKILL_DEVELOPMENT: '📚',
    CAREER_GROWTH: '🚀',
    LIFE_EXPERIENCE: '🌍',
    EXISTENTIAL_WELLBEING: '🧘',
    ABSTRACT_AMBITION: '✨'
  };

  const categoryLabels = {
    MATERIAL_ASSET: 'Материальная цель',
    SKILL_DEVELOPMENT: 'Развитие навыков',
    CAREER_GROWTH: 'Карьерный рост',
    LIFE_EXPERIENCE: 'Жизненный опыт',
    EXISTENTIAL_WELLBEING: 'Благополучие',
    ABSTRACT_AMBITION: 'Амбиция'
  };

  const getStepTitle = () => {
    if (step === 'input') return 'На пути к мечте';
    if (step === 'select_goal') return 'Выберите направления';
    return 'Выберите шаги';
  };

  const getStepDescription = () => {
    if (step === 'input') return 'Расскажите ментору о своей мечте';
    if (step === 'select_goal') return 'Можно выбрать несколько направлений';
    return 'Выберите шаги для каждого направления';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !loading && !isRecording && step === 'input' && onClose()}>
      <div 
        className="w-full max-w-lg bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shrink-0">
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
                onClick={step === 'input' ? onClose : handleBack}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              >
                {step === 'input' ? (
                  <X size={18} className="text-white" />
                ) : (
                  <ArrowRight size={18} className="rotate-180 text-white" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-6">
          {/* STEP 1: Input dream */}
          {step === 'input' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ваша мечта
                </label>
                <textarea
                  ref={inputRef}
                  value={dream}
                  onChange={(e) => {
                    setDream(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Например: Я хочу открыть свою кофейню в центре города..."
                  className="w-full h-32 px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-surface-light dark:bg-surface-dark text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none text-sm"
                  disabled={loading || isRecording}
                  maxLength={2000}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-gray-400">
                    {dream.length}/2000 символов
                  </span>
                  <span className="text-xs text-gray-400">
                    {isTranscribing ? 'Распознаём речь...' : isRecording ? 'Запись...' : 'Ctrl+Enter для отправки'}
                  </span>
                </div>
              </div>

              {/* Voice input bar */}
              <div className="mb-4">
                {isRecording || isTranscribing ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <StopCircle
                      size={28}
                      className="text-amber-500 shrink-0 cursor-pointer hover:text-amber-600 transition-colors"
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
                              backgroundColor: level > 0.6 ? '#f97316' : level > 0.3 ? '#f59e0b' : '#d97706',
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
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-amber-400 dark:hover:border-amber-500 bg-surface-light dark:bg-surface-dark hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-50"
                  >
                    <Mic size={20} />
                    <span className="text-sm font-medium">Рассказать голосом</span>
                  </button>
                )}
              </div>

              {/* Tips */}
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Как лучше описать мечту?</p>
                    <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                      <li>• Опишите желаемый результат подробно</li>
                      <li>• Укажите сроки, если есть</li>
                      <li>• Напишите, почему это важно для вас</li>
                      <li>• Расскажите голосом или напишите текстом</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Validation error */}
              {validationError && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300">{validationError}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmitDream}
                disabled={loading || !dream.trim() || isRecording}
                className={`
                  w-full py-3 rounded-[2rem] font-medium text-sm transition-all flex items-center justify-center gap-2
                  ${loading || !dream.trim() || isRecording
                    ? 'bg-surface-light dark:bg-surface-dark text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl active:scale-[0.98]'
                  }
                `}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Анализируем...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Начать путь к мечте
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-gray-400 mt-3">
                ИИ проанализирует вашу мечту и разобьёт на реальные, достижимые задачи.
                Вы сможете выбрать подходящие направления и материалы.
              </p>
            </>
          )}

          {/* STEP 2: Select goals (multi-select with checkboxes) */}
          {step === 'select_goal' && (
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Мы нашли <span className="text-amber-600 font-bold">{goals.length}</span> направлени{goals.length === 1 ? 'е' : 'й'} в вашей мечте. Выберите, с чего хотите начать:
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Можно выбрать несколько направлений — для каждого будут предложены шаги
              </p>
              <div className="flex flex-col gap-2 mb-4">
                {goals.map((goal) => {
                  const isSelected = selectedGoalIds.has(goal.goal_id);
                  return (
                    <button
                      key={goal.goal_id}
                      onClick={() => toggleGoalSelection(goal.goal_id)}
                      className={`
                        flex items-center gap-3 p-4 rounded-[2rem] text-left transition-all border-2
                        ${isSelected
                          ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-surface-dark hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 shadow-sm hover:shadow-md'
                        }
                      `}
                    >
                      {/* Checkbox */}
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all
                        ${isSelected
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-surface-dark'
                        }
                      `}>
                        {isSelected && <CheckCircle2 size={14} />}
                      </div>
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-xl shrink-0">
                        {categoryEmojis[goal.category] || '🎯'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{goal.goal_summary}</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          {categoryLabels[goal.category] || goal.category}
                        </p>
                        {goal.analysis && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 italic line-clamp-2">{goal.analysis}</p>
                        )}
                      </div>
                      <ChevronRight size={20} className="text-amber-500 shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Validation error */}
              {validationError && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300">{validationError}</p>
                </div>
              )}

              {/* Continue button */}
              <button
                onClick={handleContinueToSteps}
                disabled={selectedGoalIds.size === 0}
                className={`
                  w-full py-3 rounded-[2rem] font-medium text-sm transition-all flex items-center justify-center gap-2
                  ${selectedGoalIds.size === 0
                    ? 'bg-surface-light dark:bg-surface-dark text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl active:scale-[0.98]'
                  }
                `}
              >
                Продолжить ({selectedGoalIds.size} направлени{selectedGoalIds.size === 1 ? 'е' : 'й'})
              </button>

              <button
                onClick={() => { setStep('input'); setGoals([]); setSelectedGoalIds(new Set()); setSelectedStepsByGoal({}); }}
                className="w-full py-2.5 mt-2 rounded-[2rem] font-medium text-sm transition-all border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
              >
                Вернуться к редактированию
              </button>
            </>
          )}

          {/* STEP 3: Select steps for all selected goals (grouped) */}
          {step === 'select_steps' && (
            <>
              {goals
                .filter(goal => selectedGoalIds.has(goal.goal_id))
                .map((goal, groupIdx) => {
                  const goalSelectedSteps = selectedStepsByGoal[goal.goal_id] || [];
                  const colors = [
                    'border-amber-300 dark:border-amber-600',
                    'border-orange-300 dark:border-orange-600',
                    'border-yellow-300 dark:border-yellow-600',
                    'border-amber-400 dark:border-amber-500',
                    'border-orange-400 dark:border-orange-500',
                    'border-yellow-400 dark:border-yellow-500'
                  ];
                  const numberColors = [
                    'bg-amber-500', 'bg-orange-500', 'bg-yellow-500',
                    'bg-amber-600', 'bg-orange-600', 'bg-yellow-600'
                  ];

                  return (
                    <div key={goal.goal_id} className={groupIdx > 0 ? 'mt-5 pt-5 border-t border-gray-200 dark:border-gray-700' : ''}>
                      {/* Goal header */}
                      <div className="mb-3 p-3 rounded-[1.5rem] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-lg shrink-0">
                            {categoryEmojis[goal.category] || '🎯'}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                              {goal.goal_summary || 'Мечта'}
                            </h3>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400">
                              {categoryLabels[goal.category] || goal.category} • {goalSelectedSteps.length} шаг{goalSelectedSteps.length !== 1 ? 'ов' : ''}
                            </p>
                          </div>
                        </div>
                        {goal.analysis && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 italic mt-1">{goal.analysis}</p>
                        )}
                      </div>

                      {/* Steps for this goal */}
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 pl-1">
                          Выберите шаги для этого направления (1-5):
                        </p>
                        {goal.steps.map((stepItem, index) => {
                          const isSelected = goalSelectedSteps.includes(stepItem.id);
                          return (
                            <button
                              key={stepItem.id}
                              onClick={() => toggleStep(goal.goal_id, stepItem.id)}
                              className={`
                                flex items-center gap-3 p-3 rounded-[1.5rem] text-left transition-all border-2
                                ${isSelected 
                                  ? `${colors[index % colors.length]} bg-amber-50 dark:bg-amber-900/20 shadow-md` 
                                  : 'border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-surface-dark hover:border-amber-300 dark:hover:border-amber-600'
                                }
                              `}
                            >
                              <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0
                                ${isSelected ? numberColors[index % numberColors.length] : 'bg-gray-300 dark:bg-gray-600'}
                              `}>
                                {isSelected ? <CheckCircle2 size={14} /> : index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-white">{stepItem.text}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{stepItem.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              {/* Validation error */}
              {validationError && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2 mt-4">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300">{validationError}</p>
                </div>
              )}

              {/* Summary bar */}
              <div className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Выбрано: {selectedGoalIds.size} направлени{selectedGoalIds.size === 1 ? 'е' : 'й'}
                  </span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {Object.values(selectedStepsByGoal).reduce((sum, arr) => sum + arr.length, 0)} шагов
                  </span>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={onClose}
                className="w-full py-3 mt-4 rounded-[2rem] font-medium text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl active:scale-[0.98]"
              >
                <MessageSquare size={18} />
                Начать путь с ментором
              </button>

              <p className="text-center text-[10px] text-gray-400 mt-3">
                После подтверждения будет создан чат с ментором, который будет сопровождать вас по всем выбранным направлениям.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DreamInputModal;