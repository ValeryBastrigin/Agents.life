import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Offer() {
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
        <h1 className="ml-3 text-xl font-semibold text-gray-900 dark:text-white">Оферта</h1>
      </header>
      <main className="flex-1 px-6 py-4 max-w-3xl mx-auto w-full">
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Пользовательское соглашение (Оферта)</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-4">
            <p>1. Общие положения</p>
            <p>Настоящее Соглашение определяет условия использования Сервиса Ixteria. Используя Сервис, Пользователь подтверждает свое согласие с условиями настоящей Оферты.</p>
            <p>2. Предмет Соглашения</p>
            <p>Предметом настоящего Соглашения является предоставление Пользователю доступа к функциональным возможностям Сервиса, включая использование AI-ассистентов (секретарь, диетолог, психолог, ментор, бухгалтер) и связанных с ними сервисов.</p>
            <p>3. Права и обязанности сторон</p>
            <p>Пользователь обязуется не передавать свои учетные данные третьим лицам, не использовать Сервис для противоправной деятельности, соблюдать права интеллектуальной собственности.</p>
            <p>4. Конфиденциальность</p>
            <p>Стороны обязуются соблюдать конфиденциальность информации, полученной в рамках использования Сервиса, за исключением случаев, предусмотренных законодательством.</p>
            <p className="text-gray-400 italic mt-6">* Данный текст является заглушкой для демонстрации</p>
          </div>
        </div>
      </main>
    </div>
  );
}