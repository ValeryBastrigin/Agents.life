import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Mic, StopCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

const ChatInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevels, setAudioLevels] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const finishModeRef = useRef('send'); // 'send' or 'edit'

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
            onSendMessage(trimmed);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !disabled) {
        onSendMessage(message);
        setMessage('');
      }
    }
  };


  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      {/* Transcribing indicator */}
      {isTranscribing && (
        <div className="mb-3 px-1">
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-2xl px-4 py-2.5">
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

      <div className={`flex items-center gap-2 bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-gray-900/20 dark:shadow-black/40 p-3 border transition-all duration-200 ${isRecording ? 'border-red-400/50 dark:border-red-500/40 shadow-red-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
        {/* Attachment Button – hidden during recording */}
        {!isRecording && (
          <button
            type="button"
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200/50 dark:hover:bg-white/20 flex-shrink-0"
            title="Attach file"
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
            placeholder="Message..."
            disabled={disabled}
            className="flex-1 px-4 py-3 bg-transparent text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none disabled:opacity-50 text-base min-w-0"
          />
        )}

        {/* Right buttons: during recording – square (stop for edit) + send arrow (stop & send) */}
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
              disabled={disabled}
              className="p-4 md:p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200/50 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              title="Voice input"
            >
              <Mic size={24} className="md:size-5" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className="p-4 md:p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200/50 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send size={24} className="md:size-5" />
            </button>
          </>
        )}
      </div>
    </form>
  );
};

export default ChatInput;