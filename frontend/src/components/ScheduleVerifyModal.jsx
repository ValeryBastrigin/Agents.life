import React, { useState } from 'react';
import { X, CheckCircle2, Calendar, Loader2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { apiClient } from '../utils/apiClient';

const ScheduleVerifyModal = ({ isOpen, onClose, events, onSuccess, onEdit }) => {
  const { userId } = useUser();
  const [step, setStep] = useState('verify'); // 'verify' | 'select_period'
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveToCalendar = async () => {
    setSaving(true);
    try {
      await apiClient.post(`/api/secretary/save-parsed-schedule/${userId}`, {
        events: events || [],
        period: selectedPeriod,
        custom_date: customDate,
      });
      setSaving(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save parsed schedule:', err);
      setSaving(false);
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-blue-200/50 dark:border-blue-800/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">
                {step === 'verify' ? 'Все верно?' : 'Записать расписание на:'}
              </h2>
              <p className="text-white/80 text-sm truncate">
                {step === 'verify' ? 'Проверьте распознанные события с фотографии' : 'Выберите период для записи в календарь'}
              </p>
            </div>
            {!saving && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              >
                <X size={18} className="text-white" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          {step === 'verify' && (
            <>
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1">
                {(events || []).map((ev, idx) => (
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
                  onClick={() => {
                    onClose();
                    onEdit?.();
                  }}
                  className="py-3.5 rounded-[2rem] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm"
                >
                  2 - Изменить / Загрузить заново
                </button>
                <button
                  onClick={() => setStep('select_period')}
                  className="py-3.5 rounded-[2rem] bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/25 text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  <span>1 - Да всё верно</span>
                </button>
              </div>
            </>
          )}

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

export default ScheduleVerifyModal;
