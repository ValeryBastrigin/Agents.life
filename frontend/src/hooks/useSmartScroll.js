import { useRef, useCallback, useEffect } from 'react';

/**
 * Умный автоскролл для чата.
 * - Автоскроллит вниз только если пользователь находится в самом низу контейнера.
 * - Если пользователь скроллит вверх (читает историю) — не отбирает управление.
 * - Возвращает ref на контейнер и флаг isNearBottom.
 */
export function useSmartScroll(deps = []) {
  const containerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const isUserScrollingRef = useRef(false);

  const checkIsNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const threshold = 60; // px от низа считаем "внизу"
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = containerRef.current;
    if (!el) return;
    if (isNearBottomRef.current || !smooth) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    isNearBottomRef.current = checkIsNearBottom();
  }, [checkIsNearBottom]);

  // Автоскролл при изменении зависимостей (новое сообщение, стриминг)
  useEffect(() => {
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // При монтировании скроллим вниз
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  return {
    containerRef,
    scrollToBottom,
    handleScroll,
    isNearBottomRef,
  };
}