import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image, PieChart, Loader, CheckCircle, AlertCircle, Save, TrendingUp, Shield, AlertTriangle, Lightbulb, Star } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function PortfolioAnalysisModal({ isOpen, onClose, onComplete, userId }) {
  const [step, setStep] = useState('intro');
  const [screenshots, setScreenshots] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('intro');
      setScreenshots([]);
      setAnalysisResult(null);
      setCurrentAnalysisId(null);
      setError(null);
      setUploadProgress(0);
      setPreviewUrls([]);
      setIsSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  if (!isOpen) return null;

  const handleSelectScreenshots = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setError('Пожалуйста, выберите изображения (JPG, PNG, WEBP)');
      return;
    }

    const newUrls = validFiles.map(f => URL.createObjectURL(f));
    setPreviewUrls(prev => {
      prev.forEach(url => URL.revokeObjectURL(url));
      return newUrls;
    });

    setScreenshots(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeScreenshot = (index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartAnalysis = async () => {
    if (screenshots.length === 0) {
      setError('Добавьте хотя бы один скриншот портфеля');
      return;
    }

    setStep('uploading');
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      screenshots.forEach((file) => {
        formData.append('screenshots', file);
      });

      setUploadProgress(30);
      setStep('analyzing');

      const res = await apiClient.post(`/api/accountant/portfolio/analyze/${userId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(Math.min(pct, 90));
          }
        },
        timeout: 180000,
      });

      setUploadProgress(100);
      setAnalysisResult(res.data);
      setCurrentAnalysisId(res.data.id);
      setStep('results');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.detail || 'Ошибка при анализе портфеля. Попробуйте ещё раз.');
      setStep('intro');
    }
  };

  const handleReset = () => {
    setStep('intro');
    setScreenshots([]);
    setAnalysisResult(null);
    setCurrentAnalysisId(null);
    setError(null);
    setUploadProgress(0);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!analysisResult || !currentAnalysisId) return;
    setIsSaving(true);

    try {
      // Удаляем все старые анализы пользователя, кроме текущего
      const listRes = await apiClient.get(`/api/accountant/portfolio/analyses/${userId}`);
      const oldAnalyses = listRes.data || [];
      
      const deletePromises = oldAnalyses
        .filter(a => a.id !== currentAnalysisId)
        .map(a => apiClient.delete(`/api/accountant/portfolio/analyses/${a.id}`).catch(() => {}));
      
      await Promise.all(deletePromises);
    } catch (err) {
      console.error('Error cleaning up old analyses:', err);
    }

    setIsSaving(false);
    if (onComplete) {
      onComplete(analysisResult);
    }
    onClose();
  };

  // Helper to safely get array from possibly-json-string field
  const safeArray = (field) => {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch(e) {
        return [field];
      }
    }
    return [];
  };

  // Helper to safely parse JSON object field (e.g. asset_allocation)
  const safeObject = (field) => {
    if (field && typeof field === 'object' && !Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch(e) {}
    }
    return null;
  };

  // ===== Intro Step =====
  if (step === 'intro') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <PieChart size={22} className="text-purple-500" />
              Анализ портфеля
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="px-6 overflow-y-auto flex-1 pb-4 space-y-5">
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20 rounded-[2rem] p-5 border border-purple-200/30 dark:border-purple-700/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <TrendingUp size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                  Как это работает?
                </h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">1</span>
                  </div>
                  <p>Вы загружаете скриншоты своего инвестиционного портфеля из любого брокера или банка</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">2</span>
                  </div>
                  <p>Ixteria анализирует состав портфеля, оценивает риски и диверсификацию</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">3</span>
                  </div>
                  <p>Вы получаете детальный анализ слабых сторон и рекомендации по ребалансировке</p>
                </div>
              </div>
            </div>

            {previewUrls.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Скриншоты ({previewUrls.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <img src={url} alt={`Скриншот ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeScreenshot(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
              <button
                onClick={handleSelectScreenshots}
                className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-purple-300 dark:border-purple-600/50 rounded-[2rem] text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <Image size={18} />
                Добавить скриншоты
              </button>
              <button
                onClick={handleStartAnalysis}
                disabled={screenshots.length === 0}
                className={`w-full py-3.5 rounded-[2rem] font-medium transition-all ${
                  screenshots.length > 0
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-[1.01] active:scale-[0.98]'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <PieChart size={18} />
                  Анализировать портфель
                </div>
              </button>
            </div>
          </div>

          <div className="px-6 pb-6 pt-2">
            <button onClick={onClose} className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-[2rem] transition-colors">
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Uploading / Analyzing Step =====
  if (step === 'uploading' || step === 'analyzing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-sm shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
            {step === 'uploading' ? (
              <Upload size={28} className="text-purple-500 animate-pulse" />
            ) : (
              <Loader size={28} className="text-purple-500 animate-spin" />
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
            {step === 'uploading' ? 'Загрузка скриншотов...' : 'Анализ портфеля...'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {step === 'uploading'
              ? 'Отправляем изображения на сервер'
              : 'Ixteria изучает состав вашего портфеля'}
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{uploadProgress}%</p>
        </div>
      </div>
    );
  }

  // ===== Results Step =====
  if (step === 'results' && analysisResult) {
    const score = analysisResult.overall_score || 0;
    const strengths = safeArray(analysisResult.strengths);
    const weaknesses = safeArray(analysisResult.weaknesses);
    const recommendations = safeArray(analysisResult.recommendations);
    const assetAllocation = safeObject(analysisResult.asset_allocation);

    const allocColors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];
    const allocEntries = assetAllocation
      ? Object.entries(assetAllocation).filter(([, v]) => v > 0)
      : [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <CheckCircle size={22} className="text-green-500" />
              Результаты анализа
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="px-6 overflow-y-auto flex-1 pb-4 space-y-4">
            {/* Общая оценка со звёздами (как в виджете Accountant) */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-900/20 dark:to-emerald-900/20 rounded-[2rem] p-4 border border-green-200/30 dark:border-green-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-green-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Общая оценка портфеля</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                  score >= 7
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : score >= 4
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <span className={`text-2xl font-bold ${
                    score >= 7
                      ? 'text-green-600 dark:text-green-400'
                      : score >= 4
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {score}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-0.5 mb-1">
                    {[1,2,3,4,5,6,7,8,9,10].map(i => (
                      <Star
                        key={i}
                        size={14}
                        className={i <= score ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {score >= 8 ? 'Отличная диверсификация и низкий риск' :
                     score >= 6 ? 'Хороший портфель, есть зоны для улучшения' :
                     score >= 4 ? 'Средний уровень, требуется ребалансировка' :
                     'Требуется серьёзная ребалансировка портфеля'}
                  </p>
                </div>
              </div>
            </div>

            {/* Распределение активов — как в виджете Accountant */}
            {allocEntries.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <PieChart size={16} className="text-purple-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Распределение активов</h3>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-3">
                  {/* Полоска распределения */}
                  <div className="flex h-3 rounded-full overflow-hidden">
                    {allocEntries.map(([name, percent], idx) => (
                      <div
                        key={name}
                        style={{ width: `${percent}%` }}
                        className={`${allocColors[idx % allocColors.length]} transition-all duration-500`}
                        title={`${name}: ${percent}%`}
                      />
                    ))}
                  </div>
                  {/* Легенда */}
                  <div className="grid grid-cols-2 gap-2">
                    {allocEntries.map(([name, percent], idx) => (
                      <div key={name} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${allocColors[idx % allocColors.length]} flex-shrink-0`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{name}</span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-white ml-auto">{percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Сильные стороны */}
            {strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-green-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Сильные стороны</h3>
                </div>
                <div className="space-y-1.5">
                  {strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 rounded-[1.25rem] px-3 py-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Слабые стороны */}
            {weaknesses.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Слабые стороны</h3>
                </div>
                <div className="space-y-1.5">
                  {weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 rounded-[1.25rem] px-3 py-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Рекомендации */}
            {recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Рекомендации по ребалансировке</h3>
                </div>
                <div className="space-y-1.5">
                  {recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-[1.25rem] px-3 py-2">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0 font-bold text-xs">{i + 1}.</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-2 space-y-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-[2rem] hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSaving ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Save size={16} />
              {isSaving ? 'Сохранение...' : 'Сохранить результаты'}
            </button>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-[2rem] transition-colors"
            >
              Анализировать другой портфель
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}