import { useEffect, useRef, useState } from 'react';
import styles from './Input.module.css';
import { useThreadStore } from '@/store/threadStore';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import { transcribeAudio } from '@/service/transcription.service';
import { generateRoadmapPrompt } from '@/service/promptSharing.service';
import { applyLimits, MAX_CHARACTERS, MAX_WORDS } from '@/utils/thread';
import AudioInput, { MicIcon } from '../shared/AudioInput';

const Input = ({
  inputPlaceholder,
  inputRef,
  queryInput,
  onInputChange,
  onKeyDown,
  onSendMessage,
  onCancel,
  isActiveApiCall,
}) => {
  const isExistingChat = useThreadStore((s) => s.isExistingChat);
  const isThreadRunning = useThreadStore((s) => s.isThreadRunning);
  const setQueryInput = useThreadStore((s) => s.setQueryInput);

  const { width: windowWidth, isMobile } = useWindowDimensions();

  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUploadingJd, setIsUploadingJd] = useState(false);
  const fileInputRef = useRef(null);

  const handleJdFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingJd(true);
      const res = await generateRoadmapPrompt({ what_to_create: 'roadmap' }, file);
      if (res?.prompt) {
        setQueryInput(res.prompt);
      }
    } catch (err) {
      console.error('Failed to generate prompt from JD:', err);
    } finally {
      setIsUploadingJd(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onAudioReady = async (file) => {
    console.log('Entered in transcription...');

    try {
      setIsTranscribing(true);
      const transcription = await transcribeAudio(file);
      console.log(transcription);
      const limited = applyLimits(
        transcription.text,
        MAX_WORDS,
        MAX_CHARACTERS,
      );
      setQueryInput(limited);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranscribing(false);
      setIsVoiceRecording(false);
    }
  };

  const onAudioRcordingCancel = () => {
    setIsVoiceRecording(false);
  };

  useEffect(() => {
    const textarea = inputRef?.current;
    if (textarea) {
      if (windowWidth > 768) {
        textarea?.focus();
      }
      textarea.style.height = 'auto';

      // empty textarea -> preserve rows height
      if (!queryInput.trim()) {
        textarea.style.height = '';
        return;
      }

      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [queryInput, inputRef]);

  if (isVoiceRecording) {
    return (
      <div
        className={`${styles['input-form']} ${isExistingChat ? styles['existing-chat'] : ''} ${styles['voice-active']}`}
      >
        <AudioInput
          onAudioReady={onAudioReady}
          onCancel={onAudioRcordingCancel}
        />
      </div>
    );
  }

  return (
    <form
      className={`${styles['input-form']} ${isExistingChat ? styles['existing-chat'] : ''}`}
      onSubmit={onSendMessage}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.txt,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleJdFileChange}
      />
      <textarea
        className={styles['query-input']}
        type="text"
        name="query-input"
        id="query-input"
        rows={isExistingChat ? 1 : 5}
        placeholder={inputPlaceholder}
        value={queryInput}
        ref={inputRef}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
      ></textarea>
      <div className={styles['btn-ct']}>
        {queryInput.trim().length == 0 && (
          <>
            <button
              type="button"
              className={styles['jd-locked-btn']}
              aria-label="Upload Job Description (Locked)"
              title="Upload Job Description (Locked)"
              disabled
            >
              <LockedDocumentIcon />
            </button>
            <button
              type="button"
              className={styles['mic-btn']}
              onClick={() => setIsVoiceRecording(true)}
              aria-label="Start voice input"
              title="Voice Input"
            >
              <MicIcon />
            </button>
          </>
        )}
        {!isVoiceRecording && !isTranscribing && (
          <button
            type="submit"
            className={styles['send-btn']}
            disabled={isActiveApiCall || isUploadingJd}
            onClick={isThreadRunning ? onCancel : onSendMessage}
          >
            {isThreadRunning ? (
              <Square />
            ) : (
              <ArrowIcon
                style={{ transform: isMobile ? 'rotate(-45deg)' : 'none' }}
              />
            )}
          </button>
        )}
      </div>
    </form>
  );
};

const LockedDocumentIcon = ({ width = 18, height = 18, ...props }) => {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="m9 15 3-3 3 3" />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: 'absolute',
          bottom: -3,
          right: -4,
          background: 'var(--brand-primary)',
          borderRadius: '50%',
          padding: '1px',
          color: '#1e293b',
        }}
      >
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
  );
};

const DocumentUploadIcon = ({ width = 20, height = 20, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-6" />
      <path d="m9 15 3-3 3 3" />
    </svg>
  );
};

const ArrowIcon = ({ width = 20, height = 20, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      {...props}
    >
      <path
        d="M4.99995 9.99996L2.72412 2.60413C8.16818 4.18746 13.3019 6.68867 17.9041 9.99996C13.3022 13.3112 8.16873 15.8124 2.72495 17.3958L4.99995 9.99996ZM4.99995 9.99996H11.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Square = ({ width = 20, height = 20, ...props }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="18" height="18" rx="2" fill="#0E1629" />
    </svg>
  );
};

export default Input;
