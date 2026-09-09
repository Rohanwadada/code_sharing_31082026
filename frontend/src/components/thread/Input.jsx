import { useEffect, useState } from 'react';
import styles from './Input.module.css';
import { useThreadStore } from '@/store/threadStore';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import { transcribeAudio } from '@/service/transcription.service';
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
          <button
            type="button"
            className={styles['mic-btn']}
            onClick={() => setIsVoiceRecording(true)}
            aria-label="Start voice input"
          >
            <MicIcon />
          </button>
        )}
        {!isVoiceRecording && !isTranscribing && (
          <button
            type="submit"
            className={styles['send-btn']}
            disabled={isActiveApiCall}
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
