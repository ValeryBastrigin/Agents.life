import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Mic, MicOff, X } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

const ChatInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

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
        await transcribeAudio(blob);
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioLevels(new Array(30).fill(0));

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

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

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // Cancel recording (discard)
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Override onstop to skip transcription
      mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
  const transcribeAudio = async (blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const result = await apiClient.post('/api/transcribe', formData);

      if (result.data?.text) {
        const trimmed = result.data.text.trim();
        if (trimmed) {
          onSendMessage(trimmed);
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      {/* Recording indicator */}
      {isRecording && (
        <div className="mb-3 px-1">
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-3">
              {/* Pulsing red dot */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                Запись • {formatTime(recordingDuration)}
              </span>
            </div>
            <button
              type="button"
              onClick={cancelRecording}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-800/30 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

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

      <div className="flex items-center gap-2 bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-gray-900/20 dark:shadow-black/40 p-3 border border-gray-200 dark:border-gray-700 transition-all duration-200">
        {/* Attachment Button */}
        <button
          type="button"
          className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200/50 dark:hover:bg-white/20 flex-shrink-0"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

        {/* Input Field */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Говорите...' : 'Message...'}
          disabled={disabled || isRecording}
          className="flex-1 px-4 py-3 bg-transparent text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none disabled:opacity-50 text-base min-w-0"
        />

        {/* Voice Input Button / Audio Wave Visualization */}
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="p-3 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors rounded-full flex-shrink-0 animate-pulse"
            title="Stop recording"
          >
            <MicOff size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200/50 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Voice input"
          >
            <Mic size={20} />
          </button>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200/50 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={20} />
        </button>
      </div>

      {/* Audio waveform visualization */}
      {isRecording && (
        <div className="mt-3 flex items-center justify-center gap-0.5 h-10 px-2">
          {audioLevels.map((level, i) => {
            const height = Math.max(4, level * 36);
            return (
              <div
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-red-400 to-red-500 transition-all duration-75 ease-linear"
                style={{
                  height: `${height}px`,
                  opacity: 0.4 + level * 0.6,
                }}
              />
            );
          })}
        </div>
      )}
    </form>
  );
};

export default ChatInput;