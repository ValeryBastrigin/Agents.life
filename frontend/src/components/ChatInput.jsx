import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle, X, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import AttachMenu from './AttachMenu';

const ChatInput = ({ onSendMessage, onSendAttachment, disabled, theme = 'light', onOptimisticMessage, onAttachmentsUploaded, onFinalSend }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevels, setAudioLevels] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // ── Gemini-style: pending files with preview, uploaded lazily on send ──
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  // ── Блокировка отправки, пока превью изображений не загрузились ──
  const [previewLoadingCount, setPreviewLoadingCount] = useState(0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const finishModeRef = useRef('send'); // 'send' or 'edit'
  const attachButtonRef = useRef(null);

  // ── Хранилище blob URL, которые сейчас показываются в чате (не revoke пока не заменены) ──
  const activeBlobUrlsRef = useRef([]);

  // Revoke blob URL'ов при размонтировании компонента
  useEffect(() => {
    return () => {
      activeBlobUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
      activeBlobUrlsRef.current = [];
    };
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for visualization
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = { audioCtx, analyser, source };

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop analyser animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Stop audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // Close audio context
        if (analyserRef.current?.audioCtx) {
          analyserRef.current.audioCtx.close();
          analyserRef.current = null;
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 500) {
          // Recording too short
          setIsRecording(false);
          return;
        }

        // Send to backend for transcription
        await transcribeAudio(blob, finishModeRef.current);
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setAudioLevels(new Array(40).fill(0));

      // Start audio level visualization
      const updateLevels = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.analyser.frequencyBinCount);
        analyserRef.current.analyser.getByteFrequencyData(dataArray);

        // Calculate average level across frequency bands
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(avg / 128, 1);

        setAudioLevels((prev) => {
          const next = [...prev.slice(1), normalized];
          return next;
        });

        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Не удалось получить доступ к микрофону. Проверьте разрешения.');
    }
  }, []);

  // Stop recording – put transcribed text into input for editing
  const stopRecordingForEdit = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      finishModeRef.current = 'edit';
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // Stop recording – immediately send transcribed text to chat
  const stopRecordingAndSend = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      finishModeRef.current = 'send';
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // Cancel recording (discard, no transcription)
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (analyserRef.current?.audioCtx) {
      analyserRef.current.audioCtx.close();
      analyserRef.current = null;
    }
    setIsRecording(false);
    setAudioLevels([]);
  }, []);

  // Send audio to backend for transcription
  const transcribeAudio = async (blob, mode) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const result = await apiClient.post('/api/transcribe', formData);

      if (result.data?.text) {
        const trimmed = result.data.text.trim();
        if (trimmed) {
          if (mode === 'edit') {
            setMessage(trimmed);
          } else {
            doSend(trimmed);
          }
        }
      }
    } catch (err) {
      console.error('Transcription error:', err);
      alert('Не удалось распознать речь. Попробуйте ещё раз.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Сжатие изображения перед загрузкой (вызывается при отправке) ──
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      // Сжимаем только изображения, остальные файлы пропускаем
      if (!file.type?.startsWith('image/')) {
        resolve(file);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Если картинка уже маленькая — не сжимаем
        const MAX_SIZE = 1920;
        if (img.width <= MAX_SIZE && img.height <= MAX_SIZE) {
          resolve(file);
          return;
        }

        // Вычисляем новые размеры с сохранением пропорций
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX_SIZE) {
          h = Math.round((h * MAX_SIZE) / w);
          w = MAX_SIZE;
        } else if (h > MAX_SIZE) {
          w = Math.round((w * MAX_SIZE) / h);
          h = MAX_SIZE;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressed = new File([blob], file.name || 'image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          'image/jpeg',
          0.8
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file); // fallback
      };

      img.src = url;
    });
  };

  // ── Добавить файл в очередь превью (без загрузки на сервер) ──
  const addPendingFile = useCallback((file) => {
    setPendingFiles(prev => {
      if (prev.length >= 5) {
        alert('Максимум 5 файлов одновременно');
        return prev;
      }

      // Для изображений считаем, что превью ещё не загрузилось
      const isImage = file.type?.startsWith('image/');
      const previewUrl = URL.createObjectURL(file);

      if (isImage) {
        // Увеличиваем счётчик загрузки превью
        setPreviewLoadingCount(c => c + 1);

        // Отслеживаем загрузку изображения в DOM
        const img = new Image();
        img.onload = () => {
          setPreviewLoadingCount(c => Math.max(0, c - 1));
        };
        img.onerror = () => {
          setPreviewLoadingCount(c => Math.max(0, c - 1));
        };
        img.src = previewUrl;
      }

      return [...prev, { file, previewUrl, isImage }];
    });
  }, []);

  // ── Удалить файл из очереди ──
  const removePendingFile = (index) => {
    setPendingFiles(prev => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  // ── Обработчик выбора файла из AttachMenu ──
  const handleFileSelected = useCallback((file) => {
    // Если родитель передал колбэк — делегируем ему (старая совместимость)
    if (onSendAttachment) {
      onSendAttachment(file);
      return;
    }

    // Gemini-style: добавляем в превью, НЕ отправляем сразу
    addPendingFile(file);
    setAttachMenuOpen(false);
  }, [onSendAttachment, addPendingFile]);

  // ── Отправка сообщения: показываем в чате СРАЗУ (Gemini-like), загружаем асинхронно ──
  const doSend = useCallback(async (text) => {
    // Читаем актуальный pendingFiles через ref
    const currentFiles = pendingFilesRef.current;

    if (currentFiles.length === 0) {
      if (text.trim()) {
        onSendMessage(text);
      }
      return;
    }

    setIsUploading(true);

    // 1️⃣ Формируем вложения с локальными previewUrl (показываем в чате сразу)
    const localAttachments = currentFiles.map(pf => ({
      url: pf.previewUrl,
      filename: pf.file.name,
      type: pf.file.type,
      _isLocal: true, // метка: это локальный blob URL, требует замены
    }));

    // Если текст пустой — формируем Markdown из первого файла
    let displayText = text || currentFiles.map(pf => {
      if (pf.file.type?.startsWith('image/')) {
        return `![${pf.file.name}](${pf.previewUrl})`;
      }
      return `[${pf.file.name}](${pf.previewUrl})`;
    }).join('\n');

    // Формируем структурированное сообщение с локальными URL
    const messageWithLocalUrls = JSON.stringify({
      text: displayText,
      attachments: localAttachments,
    });

    // 2️⃣ Показываем в чате НЕМЕДЛЕННО (Gemini-like: 1 раз, без удаления)
    onOptimisticMessage(messageWithLocalUrls);

    // Регистрируем blob URL как активные — они НЕ должны быть revoke'нуты
    // до тех пор, пока не заменятся на серверные URL
    const localPendingUrls = currentFiles.map(pf => pf.previewUrl);
    activeBlobUrlsRef.current = [...activeBlobUrlsRef.current, ...localPendingUrls];

    // Очищаем превью над полем ввода
    setPendingFiles([]);
    setMessage('');
    // localPendingUrls уже вычислены выше

    // 3️⃣ Асинхронно загружаем файлы на сервер
    try {
      const uploadedAttachments = [];
      for (const [i, pf] of currentFiles.entries()) {
        const processed = await compressImage(pf.file);
        const formData = new FormData();
        formData.append('file', processed);
        const result = await apiClient.post('/api/upload', formData);
        const fileUrl = result.data?.url || result.data?.filename || pf.file.name;

        uploadedAttachments.push({
          url: fileUrl,
          filename: pf.file.name,
          type: pf.file.type,
        });
      }

      // 4️⃣ Обновляем URL в уже показанном сообщении (замена blob URL на серверные)
      if (onAttachmentsUploaded) {
        onAttachmentsUploaded(localPendingUrls, uploadedAttachments);
      }

      // 5️⃣ Запускаем стриминг AI (сообщение уже показано, не добавляем его снова)
      let finalText = text || uploadedAttachments.map(att => {
        if (att.type?.startsWith('image/')) {
          return `![${att.filename}](${att.url})`;
        }
        return `[${att.filename}](${att.url})`;
      }).join('\n');

      const finalMessage = JSON.stringify({
        text: finalText,
        attachments: uploadedAttachments,
      });

      onFinalSend(finalMessage);
    } catch (err) {
      console.error('File upload error:', err);
      // Не показываем алерт — фото уже отображаются локально
    } finally {
      setIsUploading(false);
    }
  }, [onSendMessage, onOptimisticMessage, onAttachmentsUploaded, onFinalSend]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Читаем pendingFiles через замыкание (ref) для синхронного доступа
    const hasContent = message.trim() || pendingFiles.length > 0;
    if (!hasContent || disabled || isUploading || previewLoadingCount > 0) return;
    doSend(message);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const hasContent = message.trim() || pendingFiles.length > 0;
      if (hasContent && !disabled && !isUploading && previewLoadingCount === 0) {
        doSend(message);
      }
    }
  };

  // Обработчик вставки (Ctrl+V) — добавляет изображения в превью
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        let imageFile = item.getAsFile();
        if (!imageFile.name) {
          imageFile = new File([imageFile], `pasted-image.${imageFile.type.split('/')[1] || 'png'}`, {
            type: imageFile.type,
          });
        }
        addPendingFile(imageFile);
        break; // только первое изображение
      }
    }
  }, [addPendingFile]);

  // Обработчик drag-and-drop файлов
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Обрабатываем все файлы
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      addPendingFile(files[i]);
    }
  }, [addPendingFile]);

  // ── ref-based reading of pendingFiles for synchronous doSend ──
  const pendingFilesRef = useRef(pendingFiles);
  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  const canSend = (message.trim() || pendingFiles.length > 0) && !disabled && !isUploading && previewLoadingCount === 0;

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border-2 border-dashed border-blue-400 dark:border-blue-500 text-center">
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              Отпустите файл для загрузки
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Изображения будут добавлены к сообщению
            </p>
          </div>
        </div>
      )}

      {/* Transcribing indicator */}
      {isTranscribing && (
        <div className="mb-3 px-1">
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-[2.5rem] px-4 py-2.5">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Распознавание речи...
            </span>
          </div>
        </div>
      )}

      {/* ═══ Gemini-style: превью выбранных файлов НАД полем ввода ═══ */}
      {pendingFiles.length > 0 && (
        <div className="mb-3 px-1 flex flex-wrap gap-2">
          {pendingFiles.map((pf, i) => {
            const isImage = pf.file.type?.startsWith('image/');
            return (
              <div key={i} className="relative group">
                {isImage ? (
                  <div className="relative h-20 w-20">
                    {/* Пока превью не загрузилось — показываем скелетон */}
                    {previewLoadingCount > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse z-10">
                        <Loader2 size={20} className="text-gray-400 animate-spin" />
                      </div>
                    )}
                    <img
                      src={pf.previewUrl}
                      alt={pf.file.name}
                      className="h-20 w-20 object-cover rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Paperclip size={24} className="text-gray-400" />
                  </div>
                )}
                {/* Кнопка удаления */}
                <button
                  type="button"
                  onClick={() => removePendingFile(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 dark:bg-gray-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {/* Имя файла подсказкой */}
          <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
            {pendingFiles.map(f => f.file.name).join(', ')}
          </div>
        </div>
      )}

      <div className={`flex items-center gap-2 bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-[3rem] shadow-xl shadow-gray-900/20 dark:shadow-black/40 p-3 border transition-all duration-200 ${isRecording ? 'border-red-400/50 dark:border-red-500/40 shadow-red-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
        {/* Attachment Button – hidden during recording */}
        {!isRecording && (
          <button
            ref={attachButtonRef}
            type="button"
            onClick={() => setAttachMenuOpen((prev) => !prev)}
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200/50 dark:hover:bg-white/20 flex-shrink-0"
            title="Прикрепить файл"
          >
            <Paperclip size={20} />
          </button>
        )}

        {/* Input area: text field OR audio waveform during recording */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-center gap-0.5 h-12 px-2 min-w-0">
            {audioLevels.map((level, i) => {
              const height = Math.max(3, level * 40);
              return (
                <div
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-red-400 to-red-500 transition-all duration-75 ease-linear"
                  style={{
                    height: `${height}px`,
                    opacity: 0.3 + level * 0.7,
                  }}
                />
              );
            })}
          </div>
        ) : (
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingFiles.length > 0 ? 'Добавьте подпись к фото...' : 'Message...'}
            disabled={disabled || isUploading}
            className="flex-1 px-4 py-3 bg-transparent text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none disabled:opacity-50 text-base min-w-0"
          />
        )}

        {/* Right buttons */}
        {isRecording ? (
          <>
            <button
              type="button"
              onClick={stopRecordingForEdit}
              className="p-4 md:p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-white/20 transition-colors rounded-full flex-shrink-0"
              title="Остановить и редактировать"
            >
              <StopCircle size={24} className="md:size-5" />
            </button>
            <button
              type="button"
              onClick={stopRecordingAndSend}
              className="p-4 md:p-3 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors rounded-full flex-shrink-0"
              title="Остановить и отправить"
            >
              <Send size={24} className="md:size-5" />
            </button>
          </>
        ) : (
          <>
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || isUploading}
              className="p-4 md:p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200/50 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              title="Voice input"
            >
              <Mic size={24} className="md:size-5" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!canSend}
              className={`p-4 md:p-3 transition-colors rounded-full flex-shrink-0 ${
                canSend
                  ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800/30'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <svg className="animate-spin w-5 h-5 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Send size={24} className="md:size-5" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Attach Menu – скрытые file input'ы + popover/bottom-sheet */}
      <AttachMenu
        isOpen={attachMenuOpen}
        onClose={() => setAttachMenuOpen(false)}
        onFileSelected={handleFileSelected}
        theme={theme}
        anchorRef={attachButtonRef}
      />
    </form>
  );
};

export default ChatInput;