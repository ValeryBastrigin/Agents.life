import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      <header className="sticky top-0 z-30 flex items-center px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
        </button>
        <h1 className="ml-3 text-xl font-semibold text-gray-900 dark:text-white">Политика конфиденциальности</h1>
      </header>
      <main className="flex-1 px-6 py-4 max-w-3xl mx-auto w-full">
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Политика конфиденциальности</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-4">
            <p>1. Общие положения</p>
            <p>Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей Сервиса Ixteria.</p>
            <p>2. Сбор информации</p>
            <p>Сервис собирает минимально необходимую информацию для предоставления функциональных возможностей: имя пользователя, адрес электронной почты, данные профиля.</p>
            <p>3. Использование информации</p>
            <p>Собранная информация используется исключительно для целей функционирования Сервиса, персонализации контента и улучшения качества предоставляемых услуг.</p>
            <p>4. Защита данных</p>
            <p>Сервис принимает все необходимые организационные и технические меры для защиты персональных данных пользователей от несанкционированного доступа, изменения, раскрытия или уничтожения.</p>
            <p>5. Передача данных третьим лицам</p>
            <p>Персональные данные пользователей не передаются третьим лицам, за исключением случаев, предусмотренных законодательством.</p>
            <p className="text-gray-400 italic mt-6">* Данный текст является заглушкой для демонстрации</p>
          </div>
        </div>
      </main>
    </div>
  );
}