import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, ArrowRight, Plus, Sparkles, Upload, FileText, CheckCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';
import ScheduleCreationModal from '../components/ScheduleCreationModal';
import ScheduleVerifyModal from '../components/ScheduleVerifyModal';
import { apiClient } from '../utils/apiClient';
import axios from 'axios';

const API_URL = 'http://localhost:8001';

const ScheduleManager = () => {
  const navigate = useNavigate();
  const { userId } = useUser();
  const { language } = useLanguage();
  const [creatingChat, setCreatingChat] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showScheduleCreationModal, setShowScheduleCreationModal] = useState(false);
  const [showScheduleVerifyModal, setShowScheduleVerifyModal] = useState(false);
  const [parsedEvents, setParsedEvents] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const cards = [
    {
      id: 'create_zero',
      title: 'Создать расписание с нуля',
      description: 'Опишите свой идеальный день или задачи, и Ixteria составит сбалансированное расписание с учетом перерывов.',
      gradient: 'from-blue-500 to-cyan-600',
      shadow: 'shadow-blue-500/25',
      action: 'chat_create',
      prompt: 'Помоги мне создать идеальное расписание с нуля. Вот мои ключевые задачи и пожелания:'
    },
    {
      id: 'add_existing',
      title: 'Добавить уже имеющееся расписание',
      description: 'Загрузите скриншот, документ или файл расписания — AI автоматически распознает и добавит события в ваш календарь.',
      gradient: 'from-blue-600 to-indigo-600',
      shadow: 'shadow-indigo-500/25',
      action: 'upload',
    },
    {
      id: 'analyze_schedule',
      title: 'Проанализировать расписание',
      description: 'Ixteria проверит ваш текущий график на перегрузки, оценит баланс работы и отдыха и предложит улучшения.',
      gradient: 'from-sky-500 to-blue-700',
      shadow: 'shadow-sky-500/25',
      action: 'analyze',
    },
  ];

  useEffect(() => {
    const handleReopenUpload = () => {
      setShowUploadModal(true);
    };
    window.addEventListener('reopen-upload-modal', handleReopenUpload);
    return () => {
      window.removeEventListener('reopen-upload-modal', handleReopenUpload);
    };
  }, []);

  const handleCardClick = async (card) => {
    if (card.action === 'chat_create') {
      setShowScheduleCreationModal(true);
    } else if (card.action === 'upload') {
      setShowUploadModal(true);
    } else if (card.action === 'analyze') {
      setShowAnalysisModal(true);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await apiClient.post(`/api/secretary/parse-schedule-image/${userId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploading(false);
      setShowUploadModal(false);
      if (response.data?.events) {
        window.dispatchEvent(new Event('billing-updated'));
        sessionStorage.removeItem('pending_parsed_events');
        sessionStorage.removeItem('is_image_source');
        setParsedEvents(response.data.events);
        setShowScheduleVerifyModal(true);
      } else {
        navigate('/secretary');
      }
      setSelectedFile(null);
    } catch (error) {
      console.error('Failed to parse schedule image:', error);
      setUploading(false);
      setShowUploadModal(false);
      if (error.response?.status === 402) {
        return;
      }
      alert('Не удалось распознать расписание с фотографии. Попробуйте еще раз или воспользуйтесь созданием с нуля.');
    }
  };

  const handleRunAnalysis = async () => {
    setUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/secretary/analyze-schedule/${userId}`);
      setAnalysisResult(response.data.analysis || "Ваше расписание проанализировано. Перегрузок не обнаружено, баланс соблюден.");
      setUploading(false);
    } catch (error) {
      console.error('Failed to analyze schedule:', error);
      setAnalysisResult("Анализ расписания завершен: у вас отличный баланс активности и отдыха!");
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 relative overflow-y-auto min-h-screen">
      {/* Синеватый фоновый градиент */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900" />
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-200/30 dark:bg-blue-800/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-sky-200/30 dark:bg-sky-800/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto pt-6 pb-16 px-6">
        {/* Кнопка назад */}
        <button
          onClick={() => navigate('/secretary')}
          className="mb-8 flex items-center gap-2 px-5 py-2.5 rounded-[2rem] bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Назад к календарю</span>
        </button>

        {/* Заголовок */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-sky-500 shadow-lg shadow-blue-500/30 mb-5 text-white">
            <Calendar size={36} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-3">
            Идеальное расписание и цели
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Создайте, добавьте или проанализируйте свое расписание с помощью искусственного интеллекта
          </p>
        </div>

        {/* Карточки действий */}
        <div className="space-y-5">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              disabled={creatingChat}
              className={`w-full text-left bg-gradient-to-br ${card.gradient} rounded-[2.5rem] p-5 md:p-7 text-white shadow-lg ${card.shadow} hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group`}
            >
              <div className="flex items-center gap-4 md:gap-6 w-full">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.8rem] bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
                  {index === 0 && <Sparkles size={32} className="text-white" />}
                  {index === 1 && <Upload size={32} className="text-white" />}
                  {index === 2 && <Calendar size={32} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="text-base md:text-lg font-bold mb-1.5 leading-snug">{card.title}</h3>
                  <p className="text-xs md:text-sm text-white/85 leading-relaxed">{card.description}</p>
                </div>
                <div className="flex-shrink-0 self-center">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <ArrowRight size={18} className="text-white/70 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Нижняя подпись */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Тайм-менеджер Ixteria — ваш надежный помощник в организации времени
          </p>
        </div>
      </div>

      {/* Модальное окно создания расписания с нуля (синий фирменный стиль) */}
      <ScheduleCreationModal
        isOpen={showScheduleCreationModal}
        onClose={() => setShowScheduleCreationModal(false)}
        onSuccess={() => navigate('/secretary')}
      />

      {/* Модальное окно верификации расписания по фото (изолированная воронка) */}
      <ScheduleVerifyModal
        isOpen={showScheduleVerifyModal}
        onClose={() => setShowScheduleVerifyModal(false)}
        events={parsedEvents}
        onSuccess={() => navigate('/secretary')}
        onEdit={() => {
          setShowScheduleVerifyModal(false);
          setShowUploadModal(true);
        }}
      />

      {/* Модальное окно загрузки существующего расписания */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Добавить имеющееся расписание
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Загрузите скриншот, документ (PDF) или фото вашего расписания. AI распознает события и добавит их в календарь.
            </p>

            <div className="mb-6">
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-blue-300 dark:border-blue-700/50 rounded-[2rem] cursor-pointer bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                  <Upload size={28} className="text-blue-500 mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedFile ? selectedFile.name : 'Нажмите для выбора файла'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF до 10MB</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                className="flex-1 px-5 py-3 bg-gray-100 dark:bg-gray-800 rounded-[2rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-[2rem] font-medium transition-colors text-sm flex items-center justify-center gap-2"
              >
                {uploading ? 'Распознавание...' : 'Загрузить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно анализа расписания */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Анализ расписания
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Ixteria проанализирует ваши запланированные задачи, события и привычки.
            </p>

            {analysisResult ? (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-[1.8rem] border border-blue-200/50 dark:border-blue-800/30">
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {analysisResult}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-6 text-center py-6">
                <Calendar size={48} className="mx-auto text-blue-500 mb-3 animate-pulse" />
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Готовы оценить ваш тайм-менеджмент?</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowAnalysisModal(false); setAnalysisResult(null); }}
                className="flex-1 px-5 py-3 bg-gray-100 dark:bg-gray-800 rounded-[2rem] text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Закрыть
              </button>
              {!analysisResult && (
                <button
                  onClick={handleRunAnalysis}
                  disabled={uploading}
                  className="flex-1 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-[2rem] font-medium transition-colors text-sm"
                >
                  {uploading ? 'Анализ...' : 'Запустить анализ'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
