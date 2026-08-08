import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Image, File, Camera } from 'lucide-react';

/**
 * AttachMenu – popover на ПК, bottom sheet на мобильных.
 *
 * ═══ КЛЮЧЕВАЯ ИДЕЯ ═══
 * Меню рендерится через React Portal в document.body, чтобы быть
 * абсолютно сверху всех контейнеров, независимо от их overflow / transform / z-index.
 *
 * Input'ы для выбора файлов рендерятся ОДИН раз (вне условий),
 * поэтому ref'ы всегда валидны.
 */
const AttachMenu = ({ isOpen, onClose, onFileSelected, theme = 'light', anchorRef }) => {
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const pcMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const isDark = theme === 'dark';

  // ── Позиционирование popover ──
  const updatePosition = useCallback(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popoverWidth = 220;
    let left = rect.left;
    // Не вылезаем за правый край
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    setPosition({
      bottom: window.innerHeight - rect.top + 8, // над кнопкой
      left: Math.max(8, left),
    });
  }, [anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // ── Закрытие по клику вне (capture фаза) ──
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e) => {
      // Клик на кнопке-якоре — не закрываем (пусть ChatInput сам управляет)
      if (anchorRef?.current?.contains(e.target)) return;
      // Клик внутри любого из меню — не закрываем
      if (pcMenuRef.current?.contains(e.target)) return;
      if (mobileMenuRef.current?.contains(e.target)) return;
      onClose();
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [isOpen, onClose, anchorRef]);

  // ── Выбор файла ──
  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelected(file);
        onClose();
      }
      e.target.value = '';
    },
    [onFileSelected, onClose]
  );

  // ── Кнопки меню ──
  const renderButtons = () => {
    const baseCls =
      'w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors cursor-pointer ' +
      (isDark
        ? 'hover:bg-surface-dark text-gray-200'
        : 'hover:bg-gray-100 text-gray-800');
    const iconCls = isDark ? 'text-gray-400' : 'text-gray-500';

    return (
      <>
        <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className={baseCls}>
          <File size={22} className={iconCls} />
          <span className="text-base font-medium">Загрузить файл</span>
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click(); }} className={baseCls}>
          <Image size={22} className={iconCls} />
          <span className="text-base font-medium">Загрузить фото</span>
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }} className={baseCls}>
          <Camera size={22} className={iconCls} />
          <span className="text-base font-medium">Открыть камеру</span>
        </button>
      </>
    );
  };

  // ── Popover (ПК) ──
  const renderPCPopover = () => (
    <div
      ref={pcMenuRef}
      className={`rounded-2xl shadow-2xl border p-2 min-w-[220px] animate-fade-in ${
        isDark ? 'bg-background-dark border-gray-700/50' : 'bg-white border-gray-200/50'
      }`}
      style={{
        position: 'fixed',
        bottom: position.bottom,
        left: position.left,
        zIndex: 2147483647, // max z-index
      }}
    >
      {renderButtons()}
    </div>
  );

  // ── Bottom sheet (мобильные) ──
  const renderMobileSheet = () => (
    <>
      {/* Оверлей */}
      <div
        className="fixed inset-0 bg-black/20"
        style={{ zIndex: 2147483646 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />
      {/* Сам sheet */}
      <div
        ref={mobileMenuRef}
        className={`fixed bottom-0 left-0 right-0 rounded-t-3xl border-t-2 shadow-2xl ${
          isDark ? 'bg-background-dark border-gray-700/50' : 'bg-white border-gray-200/50'
        }`}
        style={{
          zIndex: 2147483647,
          animation: 'slideUpIn 0.25s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
        }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
        </div>
        <div className="px-4 pb-6 space-y-1">
          {renderButtons()}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ═══ Input'ы — всегда в том месте, где сам компонент ═══ */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="*/*" tabIndex={-1} />
      <input ref={photoInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*" tabIndex={-1} />
      <input ref={cameraInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*" capture="environment" tabIndex={-1} />

      {/* ═══ Popover / Bottom sheet — через Portal в body ═══ */}
      {isOpen && createPortal(
        <>
          {/* ПК */}
          <div className="hidden md:block">{renderPCPopover()}</div>
          {/* Мобильные */}
          <div className="md:hidden">{renderMobileSheet()}</div>
        </>,
        document.body
      )}
    </>
  );
};

export default AttachMenu;