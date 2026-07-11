import React, { useState, useRef } from 'react';
import { X, Upload, FileText, TrendingUp, TrendingDown, PieChart, Check, AlertCircle, Loader, Save, RefreshCw, Wallet } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

// Цвета для категорий
const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#06B6D4', '#D946EF', '#0EA5E9', '#22C55E', '#EAB308',
];

// Иконка для категории
const categoryIcons = {
  'продукты': '🛒',
  'транспорт': '🚗',
  'жильё': '🏠',
  'коммунальные услуги': '💡',
  'развлечения': '🎮',
  'здоровье': '🏥',
  'одежда': '👕',
  'связь': '📱',
  'образование': '📚',
  'доход': '💰',
  'зарплата': '💼',
  'подработка': '💻',
  'переводы': '💸',
  'прочее': '📦',
  'кафе и рестораны': '🍽️',
  'супермаркеты': '🛍️',
  'аптеки': '💊',
  'спорт': '🏋️',
  'путешествия': '✈️',
  'подарки': '🎁',
  'страхование': '🛡️',
  'налоги': '📋',
};

const getIconForCategory = (cat) => {
  const lower = cat.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lower.includes(key)) return icon;
  }
  return '📄';
};

const getColorForIndex = (idx) => CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

const formatCurrency = (amount) => {
  return Math.abs(amount).toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Шаг 1: Описание функционала
const StepIntro = ({ onAddStatement, onClose }) => {
  const today = new Date();
  const monthNames = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const formatDate = (d) => `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

  return (
    <div className="flex flex-col items-center text-center px-2 py-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg">
        <PieChart size={36} className="text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
        Анализ расходов
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm">
        Загрузите банковскую выписку, и Ixteria проанализирует её — 
        достанет все траты и поступления, распределит по категориям.
      </p>

      {/* Подсказка про период */}
      <div className="mt-4 w-full bg-purple-50 dark:bg-purple-900/20 rounded-[1.5rem] p-4 text-left border border-purple-100 dark:border-purple-800/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText size={16} className="text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
              Выписка за 1 месяц
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Получите выписку в приложении вашего банка за период:
            </p>
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-1">
              с {formatDate(monthStart)} по {formatDate(today)}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-2 leading-relaxed">
              Загружайте выписку именно за 1 месяц — так Ixteria сможет наиболее точно проанализировать ваши финансы.
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 leading-relaxed max-w-xs">
        В дальнейшем вы сможете провести анализ и найти слабые места в финансах.
      </p>
      <button
        onClick={onAddStatement}
        className="mt-5 w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold rounded-[2rem] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm"
      >
        <Upload size={18} />
        Добавить выписку
      </button>
      <button
        onClick={onClose}
        className="mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
      >
        Закрыть
      </button>
    </div>
  );
};

// Шаг 2: Загрузка файла
const StepUpload = ({ onFileSelected, onBack }) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (file) onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className="px-2 py-4">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">
        Загрузите банковскую выписку
      </h3>
      
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-[2rem] p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Upload size={24} className="text-purple-500" />
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Нажмите для выбора файла
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          или перетащите файл сюда
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2">
          Поддерживаются TXT, CSV, PDF, XLSX
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.pdf,.xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      <button
        onClick={onBack}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors w-full text-center"
      >
        ← Назад
      </button>
    </div>
  );
};

// Шаг 3: Обработка (лоадер)
const StepProcessing = ({ filename }) => (
  <div className="flex flex-col items-center text-center px-2 py-8">
    <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
      <Loader size={32} className="text-purple-500 animate-spin" />
    </div>
    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
      Анализируем выписку
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
      {filename}
    </p>
    <p className="text-xs text-gray-400 dark:text-gray-500">
      Ixteria обрабатывает транзакции через ИИ...
    </p>
    <div className="mt-6 w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full animate-pulse w-2/3" />
    </div>
  </div>
);

// Шаг 4: Результат анализа
const StepResult = ({ result, onSave, onClose, saved }) => {
  const categories = result.categories || {};
  const categoryEntries = Object.entries(categories).sort((a, b) => {
    const aTotal = a[1].expense + a[1].income;
    const bTotal = b[1].expense + b[1].income;
    return bTotal - aTotal;
  });

  const totalExpense = result.total_expense || 0;
  const totalIncome = result.total_income || 0;
  const balance = totalIncome - totalExpense;

  // Собираем транзакции по категориям
  const txByCategory = {};
  (result.transactions || []).forEach((tx) => {
    const cat = tx.category || 'Прочее';
    if (!txByCategory[cat]) txByCategory[cat] = [];
    txByCategory[cat].push(tx);
  });

  const [expandedCats, setExpandedCats] = React.useState({});
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);

  const toggleCategory = (catName) => {
    setExpandedCats((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  return (
    <div className="px-1 py-2 space-y-5">
      {/* Заголовок */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Check size={28} className="text-green-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
          Анализ завершён
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {result.bank_name && `${result.bank_name} • `}
          {result.period?.start && result.period?.end
            ? `${result.period.start} — ${result.period.end}`
            : 'Период не указан'}
        </p>
      </div>

      {/* Итого: доходы / расходы / баланс */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-[1.5rem] p-3 text-center">
          <TrendingUp size={16} className="text-green-500 mx-auto mb-1" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Доходы</p>
          <p className="text-sm font-bold text-green-600 dark:text-green-400">
            +{formatCurrency(totalIncome)} ₽
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-[1.5rem] p-3 text-center">
          <TrendingDown size={16} className="text-red-500 mx-auto mb-1" />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Расходы</p>
          <p className="text-sm font-bold text-red-600 dark:text-red-400">
            -{formatCurrency(totalExpense)} ₽
          </p>
        </div>
        <div className={`rounded-[1.5rem] p-3 text-center ${
          balance >= 0
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : 'bg-amber-50 dark:bg-amber-900/20'
        }`}>
          <Wallet size={16} className={`mx-auto mb-1 ${
            balance >= 0 ? 'text-blue-500' : 'text-amber-500'
          }`} />
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Баланс</p>
          <p className={`text-sm font-bold ${
            balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            {balance >= 0 ? '+' : ''}{formatCurrency(balance)} ₽
          </p>
        </div>
      </div>

      {/* Категории с детальными транзакциями — свёрнуты по умолчанию */}
      <div>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setCategoriesOpen(!categoriesOpen)}
        >
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <PieChart size={16} className="text-purple-500" />
            Категории
          </h4>
          <span className="text-xs text-purple-500 font-medium">
            {categoriesOpen ? '▲ скрыть' : `▼ ${categoryEntries.length} категорий`}
          </span>
        </div>

        {categoriesOpen && (
          <div className="mt-3 space-y-2">
            {categoryEntries.map(([catName, catData], idx) => {
              const isExpanded = expandedCats[catName] || false;
              const catTxns = txByCategory[catName] || [];
              return (
                <div
                  key={catName}
                  className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-[1.5rem] cursor-pointer"
                  onClick={() => catTxns.length > 0 && toggleCategory(catName)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getIconForCategory(catName)}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{catName}</p>
                        <p className="text-[10px] text-gray-400">
                          {catData.count} операций
                          {catTxns.length > 0 && (
                            <span className="ml-2 text-xs text-purple-400">
                              {isExpanded ? '▲ скрыть' : '▼ детали'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {catData.expense > 0 && (
                        <p className="text-xs font-bold text-red-500">
                          -{formatCurrency(catData.expense)} ₽
                        </p>
                      )}
                      {catData.income > 0 && (
                        <p className="text-xs font-bold text-green-500">
                          +{formatCurrency(catData.income)} ₽
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Прогресс-бар расхода */}
                  {totalExpense > 0 && catData.expense > 0 && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((catData.expense / totalExpense) * 100, 100)}%`,
                          backgroundColor: getColorForIndex(idx),
                        }}
                      />
                    </div>
                  )}

                  {/* Детальные транзакции внутри категории */}
                  {isExpanded && catTxns.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
                      {catTxns.map((tx, txi) => (
                        <div
                          key={txi}
                          className="flex items-center justify-between text-xs pl-1"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-gray-400 w-16 flex-shrink-0">
                              {tx.date || '—'}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 truncate">
                              {tx.description}
                            </span>
                          </div>
                          <span
                            className={`font-medium flex-shrink-0 ml-2 ${
                              tx.type === 'income'
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount)} ₽
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Анализ от LLM */}
      {result.analysis && (
        <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-[2rem]">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <RefreshCw size={14} className="text-purple-500" />
            Анализ Ixteria
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {result.analysis}
          </p>
        </div>
      )}

      {/* Кнопки */}
      <div className="space-y-2 pt-2">
        {!saved && (
          <button
            onClick={onSave}
            className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold rounded-[2rem] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm"
          >
            <Save size={18} />
            Сохранить
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-[2rem] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          {saved ? 'Закрыть' : 'Отмена'}
        </button>
      </div>
    </div>
  );
};

// Шаг 5: Ошибка
const StepError = ({ error, onRetry, onClose }) => (
  <div className="flex flex-col items-center text-center px-2 py-6">
    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
      <AlertCircle size={32} className="text-red-500" />
    </div>
    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
      Ошибка анализа
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
      {error || 'Не удалось обработать выписку. Попробуйте другой формат файла.'}
    </p>
    <button
      onClick={onRetry}
      className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold rounded-[2rem] transition-all duration-200 shadow-md flex items-center justify-center gap-2 text-sm"
    >
      <RefreshCw size={16} />
      Попробовать снова
    </button>
    <button
      onClick={onClose}
      className="mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
    >
      Закрыть
    </button>
  </div>
);

// ===== Главный компонент модалки =====
const StatementAnalysisModal = ({ isOpen, onClose, onStatementSaved }) => {
  const [step, setStep] = useState('intro'); // intro, upload, processing, result, error
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Сброс состояния при открытии
  React.useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setSelectedFile(null);
      setResult(null);
      setError('');
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddStatement = () => {
    setStep('upload');
  };

  const handleFileSelected = async (file) => {
    setSelectedFile(file);
    setStep('processing');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/api/accountant/statements/upload/1', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, // 3 минуты
      });
      
      setResult(response.data);
      setStep('result');
    } catch (err) {
      console.error('Ошибка загрузки выписки:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(err.message || 'Не удалось загрузить выписку');
      }
      setStep('error');
    }
  };

  const handleSave = () => {
    setSaved(true);
    if (onStatementSaved) {
      onStatementSaved();
    }
  };

  const handleRetry = () => {
    setStep('upload');
    setSelectedFile(null);
    setResult(null);
    setError('');
  };

  const handleBack = () => {
    setStep('intro');
    setSelectedFile(null);
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return <StepIntro onAddStatement={handleAddStatement} onClose={onClose} />;
      case 'upload':
        return <StepUpload onFileSelected={handleFileSelected} onBack={handleBack} />;
      case 'processing':
        return <StepProcessing filename={selectedFile?.name || ''} />;
      case 'result':
        return (
          <StepResult
            result={result}
            onSave={handleSave}
            onClose={onClose}
            saved={saved}
          />
        );
      case 'error':
        return <StepError error={error} onRetry={handleRetry} onClose={onClose} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background-light dark:bg-background-dark rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <PieChart size={22} className="text-purple-500" />
            Анализ расходов
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 overflow-y-auto flex-1 pb-4">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default StatementAnalysisModal;