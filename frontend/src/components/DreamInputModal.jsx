import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, AlertTriangle, Lightbulb, Mic, StopCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

const DreamInputModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [dream, setDream] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevels, setAudioLevels] = useState([]);
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
    
    // Minimum length check
    if (trimmed.length < 10) {
      return 'Слишком коротко. Опишите свою мечту подробнее (минимум 10 символов).';
    }
    
    // Maximum length check
    if (trimmed.length > 2000) {
      return 'Слишком длинно. Пожалуйста, сократите описание до 2000 символов.';
    }

    // All checks passed
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

  const handleSubmit = () => {
    const error = validateDream(dream);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    onSubmit(dream);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !isLoading && !isRecording && onClose()}>
      <div 
        className="w-full max-w-lg bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">Расскажите о своей мечте</h2>
              <p className="text-white/80 text-sm truncate">Ментор поможет разбить её на достижимые цели</p>
            </div>
            {!isLoading && !isRecording && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              >
                <X size={18} className="text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-6">
          {/* Input area */}
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
              disabled={isLoading || isRecording}
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
                disabled={isLoading}
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
            onClick={handleSubmit}
            disabled={isLoading || !dream.trim() || isRecording}
            className={`
              w-full py-3 rounded-[2rem] font-medium text-sm transition-all flex items-center justify-center gap-2
              ${isLoading || !dream.trim() || isRecording
                ? 'bg-surface-light dark:bg-surface-dark text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl active:scale-[0.98]'
              }
            `}
          >
            {isLoading ? (
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

          {/* Trust note */}
          <p className="text-center text-[10px] text-gray-400 mt-3">
            ИИ проанализирует вашу мечту и разобьёт на реальные, достижимые задачи.
            Вы сможете выбрать подходящие направления и материалы.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DreamInputModal;