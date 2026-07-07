import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, AlertTriangle, Lightbulb, Heart, Star, Target } from 'lucide-react';

const DreamInputModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [dream, setDream] = useState('');
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

    // Check for gibberish / spam patterns
    const gibberishPatterns = [
      /^[a-zA-Z\s]{1,20}$/i,              // Only English letters with no meaning
      /(.)\1{5,}/,                          // Repeated characters (aaaaaa)
      /^(.)\1{3,}\s*$/,                     // Single char repeated
      /^[\d\W_]{10,}$/,                     // Mostly numbers/symbols
      /(?:а{3,}|б{3,}|в{3,}|ы{3,}|й{3,})/i, // Russian letter spam
      /^[\s]{10,}$/,                        // Only spaces
    ];

    for (const pattern of gibberishPatterns) {
      if (pattern.test(trimmed)) {
        return 'Пожалуйста, введите настоящую мечту. Это не похоже на осмысленный текст.';
      }
    }

    // Check for excessive emoji usage (>50% of content)
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojiMatches = trimmed.match(emojiRegex);
    if (emojiMatches && emojiMatches.length > trimmed.replace(emojiRegex, '').length * 0.5) {
      return 'Слишком много эмодзи. Пожалуйста, опишите мечту текстом.';
    }

    // Check for repetition (same sentence repeated 3+ times)
    const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 5);
    if (sentences.length >= 3) {
      const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
      if (uniqueSentences.size <= 1) {
        return 'Обнаружен повтор одного и того же. Пожалуйста, напишите развёрнутое описание.';
      }
    }

    // All checks passed
    return '';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !isLoading && onClose()}>
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
            {!isLoading && (
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
              disabled={isLoading}
              maxLength={2000}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">
                {dream.length}/2000 символов
              </span>
              <span className="text-xs text-gray-400">
                Ctrl+Enter для отправки
              </span>
            </div>
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
            disabled={isLoading || !dream.trim()}
            className={`
              w-full py-3 rounded-[2rem] font-medium text-sm transition-all flex items-center justify-center gap-2
              ${isLoading || !dream.trim()
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