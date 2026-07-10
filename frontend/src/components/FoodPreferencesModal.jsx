import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Lightbulb, AlertTriangle } from 'lucide-react';

const FoodPreferencesModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [preferences, setPreferences] = useState('');
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmed = preferences.trim();
    if (trimmed.length < 5) {
      setValidationError('Пожалуйста, напишите хотя бы несколько слов о ваших предпочтениях.');
      return;
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !isLoading && onClose()}>
      <div 
        className="w-full max-w-lg bg-background-light dark:bg-background-dark rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">Ваши пожелания к рациону</h2>
              <p className="text-white/80 text-sm truncate">Расскажите, что бы вы хотели видеть в своём меню</p>
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
              Ваши предпочтения в еде
            </label>
            <textarea
              ref={inputRef}
              value={preferences}
              onChange={(e) => {
                setPreferences(e.target.value);
                if (validationError) setValidationError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Например: я вегетарианец, не люблю острое, хочу больше белковых блюд, предпочитаю средиземноморскую кухню..."
              className="w-full h-32 px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-surface-light dark:bg-surface-dark text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-500/20 outline-none transition-all resize-none text-sm"
              disabled={isLoading}
              maxLength={2000}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">
                {preferences.length}/2000 символов
              </span>
              <span className="text-xs text-gray-400">
                Ctrl+Enter для отправки
              </span>
            </div>
          </div>

          {/* Tips */}
          <div className="mb-4 p-3 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <Lightbulb size={16} className="text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">Что можно указать?</p>
                <ul className="text-xs text-green-700 dark:text-green-300 space-y-0.5">
                  <li>• Любимые и нелюбимые продукты</li>
                  <li>• Диетические ограничения (аллергии, веганство и т.д.)</li>
                  <li>• Предпочтительная кухня (итальянская, азиатская и т.д.)</li>
                  <li>• Сколько времени готовы уделять приготовлению</li>
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
            disabled={isLoading || !preferences.trim()}
            className={`
              w-full py-3 rounded-[2rem] font-medium text-sm transition-all flex items-center justify-center gap-2
              ${isLoading || !preferences.trim()
                ? 'bg-surface-light dark:bg-surface-dark text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:shadow-xl active:scale-[0.98]'
              }
            `}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Генерируем рацион...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Создать рацион
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-gray-400 mt-3">
            Ixteria учтёт все ваши пожелания и составит идеальный рацион на день.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FoodPreferencesModal;