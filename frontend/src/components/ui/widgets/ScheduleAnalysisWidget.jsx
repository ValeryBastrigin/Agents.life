import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Activity, X, Clock, AlertTriangle, Lightbulb, Trophy } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import { apiClient } from '../../../utils/apiClient';

const ScheduleAnalysisWidget = () => {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [savedAnalysis, setSavedAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (userId) {
      loadSavedAnalysis();
    }
  }, [userId]);

  const loadSavedAnalysis = async () => {
    try {
      const res = await apiClient.get(`/api/secretary/saved-analysis/${userId}`);
      if (res.data?.exists) {
        setSavedAnalysis(res.data);
      } else {
        setSavedAnalysis(null);
      }
    } catch (err) {
      console.error('Failed to load saved schedule analysis widget:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseAnalysisText = (rawText) => {
    if (!rawText) return { general: '', balance: '', overloads: '', tips: [], motivation: '' };
    const cleaned = rawText.replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '');
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

  if (loading) return null;

  const parsed = savedAnalysis ? parseAnalysisText(savedAnalysis.analysis_data) : null;

  return (
    <>
      <div className="w-full bg-gradient-to-br from-blue-600/10 via-cyan-600/5 to-transparent dark:from-blue-900/20 dark:to-gray-900 rounded-[2.5rem] p-6 border border-blue-200/50 dark:border-blue-800/40 shadow-lg backdrop-blur-md mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">Рецензия и анализ расписания</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {savedAnalysis && savedAnalysis.start_date
                  ? `Период: ${savedAnalysis.start_date}${savedAnalysis.end_date && savedAnalysis.end_date !== savedAnalysis.start_date ? ' — ' + savedAnalysis.end_date : ''}`
                  : 'ИИ-анализ вашего тайм-менеджмента'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/schedule-manager')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-md shadow-blue-500/20"
          >
            <span>Сделать анализ</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {savedAnalysis ? (
          <div 
            onClick={() => setShowModal(true)}
            className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/50 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <Activity size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                  {savedAnalysis.analysis_data}
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1.5 flex items-center gap-1">
                  <span>Нажмите, чтобы открыть рецензию по блокам</span>
                  <ArrowRight size={12} />
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              У вас еще нет сохраненного анализа расписания. Нажмите «Сделать анализ», выберите даты в календаре и сохраните рецензию!
            </p>
          </div>
        )}
      </div>

      {/* Modal to view analysis in structured blocks */}
      {showModal && savedAnalysis && parsed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-16 sm:pt-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
          <div 
            className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden max-h-[80vh] sm:max-h-[85vh] flex flex-col border border-blue-200/50 dark:border-blue-800/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Рецензия и анализ расписания</h2>
                  <p className="text-white/80 text-sm mt-0.5">
                    {savedAnalysis.start_date ? `Период: ${savedAnalysis.start_date}${savedAnalysis.end_date && savedAnalysis.end_date !== savedAnalysis.start_date ? ' — ' + savedAnalysis.end_date : ''}` : 'ИИ-анализ графика'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* Scrollable Body with blocks */}
            <div className="overflow-y-auto p-6 space-y-4">
              {parsed.general && (
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                  <Activity size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Общая оценка</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{parsed.general}</p>
                  </div>
                </div>
              )}

              {parsed.balance && (
                <div className="p-4 rounded-2xl bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 flex items-start gap-3">
                  <Clock size={20} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Баланс работы и отдыха</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{parsed.balance}</p>
                  </div>
                </div>
              )}

              {parsed.overloads && (
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Перегрузки и напряжение</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{parsed.overloads}</p>
                  </div>
                </div>
              )}

              {parsed.tips && parsed.tips.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                  <Lightbulb size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-2">Советы по тайм-менеджменту</h4>
                    <ul className="space-y-1.5">
                      {parsed.tips.map((tip, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2">
                          <span className="font-bold text-indigo-500">•</span>
                          <span className="leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {parsed.motivation && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                  <Trophy size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">Мотивация</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{parsed.motivation}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3.5 rounded-[2rem] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm mt-4"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleAnalysisWidget;
