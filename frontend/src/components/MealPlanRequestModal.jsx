import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, X, Lightbulb, Mic, StopCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

const MealPlanRequestModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [preferences, setPreferences] = useState('');
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
          setPreferences((prev) => {
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
    const trimmed = preferences.trim();
    if (trimmed.length > 2000) {
      setValidationError('Слишком длинно. Пожалуйста, сократите до 2000 символов.');
      return;
    }
    setValidationError('');
    onSubmit(trimmed);
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
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">Что бы вы хотели покушать?</h2>
              <p className="text-white/80 text-sm truncate">Расскажите о своих пожеланиях голосом или текстом</p>
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
              Ваши пожелания
            </label>
            <textarea
              ref={inputRef}
              value={preferences}
              onChange={(e) => {
                setPreferences(e.target.value);
                if (validationError) setValidationError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Например: хочу что-то лёгкое на ужин, без мяса, с пастой..."
              className="w-full h-32 px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-surface-light dark:bg-surface-dark text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-500/20 outline-none transition-all resize-none text-sm"
              disabled={isLoading || isRecording}
              maxLength={2000}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">
                {preferences.length}/2000 символов
              </span>
              <span className="text-xs text-gray-400">
                {isTranscribing ? 'Распознаём речь...' : isRecording ? 'Запись...' : 'Ctrl+Enter для отправки'}
              </span>
            </div>
          </div>

          {/* Voice input bar */}
          <div className="mb-4">
            {isRecording || isTranscribing ? (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <StopCircle
                  size={28}
                  className="text-red-500 shrink-0 cursor-pointer hover:text-red-600 transition-colors"
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
                          backgroundColor: level > 0.6 ? '#ef4444' : level > 0.3 ? '#f97316' : '#22c55e',
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
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 bg-surface-light dark:bg-surface-dark hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
              >
                <Mic size={20} />
                <span className="text-sm font-medium">Записать голосом</span>
              </button>
            )}
          </div>

          {/* Tips */}
          <div className="mb-4 p-3 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <Lightbulb size={16} className="text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">Что можно рассказать?</p>
                <ul className="text-xs text-green-700 dark:text-green-300 space-y-0.5">
                  <li>• Какие продукты любите, а какие не хотите видеть</li>
                  <li>• Что хотите на завтрак, обед или ужин</li>
                  <li>• Диетические ограничения (аллергии, веганство)</li>
                  <li>• Предпочтительную кухню (итальянская, японская и т.д.)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <X size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">{validationError}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || isRecording}
            className={`
              w-full py-3 rounded-[2rem] font-medium text-sm transition-all flex items-center justify-center gap-2
              ${isLoading || !preferences.trim() || isRecording
                ? 'bg-surface-light dark:bg-surface-dark text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:shadow-xl active:scale-[0.98]'
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Создаём рацион...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Создать рацион
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-gray-400 mt-3">
            Ixteria учтёт ваши пожелания и составит идеальный рацион на день.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MealPlanRequestModal;