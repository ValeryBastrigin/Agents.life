import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Image, Camera, File, X } from 'lucide-react';

/**
 * AttachMenu – меню вложений (файл, фото, камера).
 * 
 * На ПК (md+): всплывающее окошко прикрепленное к кнопке-скрепке (popover).
 * На мобильных (<md): bottom sheet, выезжающий снизу.
 * 
 * @param {Object}   props
 * @param {boolean}  props.isOpen – управление видимостью извне
 * @param {Function} props.onClose – закрыть меню
 * @param {Function} props.onFileSelected(file: File) – колбэк при выборе файла
 * @param {string}   props.theme – 'light' | 'dark'
 * @param {Object}   props.anchorRef – React ref на кнопку-скрепку (для позиционирования popover'а)
 */
const AttachMenu = ({ isOpen, onClose, onFileSelected, theme = 'light', anchorRef }) => {
  const [popoverStyle, setPopoverStyle] = useState({});
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isDark = theme === 'dark';

  // Вычисляем позицию popover'а относительно кнопки
  const updatePopoverPosition = useCallback(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPopoverStyle({
      bottom: `${window.innerHeight - rect.top + 12}px`,
      left: `${rect.left}px`,
    });
  }, [anchorRef]);

  // При открытии пересчитываем позицию
  useEffect(() => {
    if (isOpen) {
      updatePopoverPosition();
      window.addEventListener('resize', updatePopoverPosition);
      window.addEventListener('scroll', updatePopoverPosition, true);
      return () => {
        window.removeEventListener('resize', updatePopoverPosition);
        window.removeEventListener('scroll', updatePopoverPosition, true);
      };
    }
  }, [isOpen, updatePopoverPosition]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      onClose();
    }
    // Reset input для повторного выбора того же файла
    e.target.value = '';
  };

  // Общие стили для кнопок меню
  const menuItemClass = `w-full flex items-center gap-4 px-4 py-4 rounded-[2rem] transition-colors text-left ${
    isDark
      ? 'hover:bg-surface-dark text-gray-200'
      : 'hover:bg-gray-100 text-gray-800'
  }`;

  const iconClass = isDark ? 'text-gray-400' : 'text-gray-600';

  const menuContent = (
    <>
      {/* Скрытые input'ы */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
      />
      <input
        ref={photoInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="image/*"
      />
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
      />

      {/* Загрузить файл */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className={menuItemClass}
      >
        <File size={22} className={iconClass} />
        <span className="text-base font-medium">Загрузить файл</span>
      </button>

      {/* Загрузить фото */}
      <button
        onClick={() => photoInputRef.current?.click()}
        className={menuItemClass}
      >
        <Image size={22} className={iconClass} />
        <span className="text-base font-medium">Загрузить фото</span>
      </button>

      {/* Открыть камеру */}
      <button
        onClick={() => cameraInputRef.current?.click()}
        className={menuItemClass}
      >
        <Camera size={22} className={iconClass} />
        <span className="text-base font-medium">Открыть камеру</span>
      </button>
    </>
  );

  return (
    <>
      {/* ============ ПК-версия: Popover у скрепки ============ */}
      <div className="hidden md:block">
        {/* Невидимый фон для закрытия по клику вне */}
        <div
          className="fixed inset-0 bg-transparent z-40"
          onClick={onClose}
        />
        <div
          className={`fixed z-50 rounded-[2rem] shadow-2xl border p-2 min-w-[220px] ${
            isDark
              ? 'bg-background-dark border-gray-700/50'
              : 'bg-white border-gray-200/50'
          }`}
          style={{
            bottom: popoverStyle.bottom,
            left: popoverStyle.left,
          }}
        >
          {menuContent}
        </div>
      </div>

      {/* ============ Мобильная версия: Bottom Sheet ============ */}
      <div className="md:hidden">
        {/* Оверлей для закрытия по клику */}
        <div
          className="fixed inset-0 bg-transparent z-40"
          onClick={onClose}
        />
        {/* Панель снизу */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 shadow-2xl rounded-t-3xl border-t-2 ${
            isDark
              ? 'bg-background-dark border-gray-600/60'
              : 'bg-white border-gray-300'
          }`}
          style={{
            animation: 'slideUpIn 0.35s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
          }}
        >
          {/* Drag indicator */}
          <div className="flex justify-center pt-3 pb-2">
            <div
              className={`w-12 h-1.5 rounded-full ${
                isDark ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            />
          </div>

          <div className="p-4 space-y-1">{menuContent}</div>
        </div>
      </div>
    </>
  );
};

export default AttachMenu;