import Image from 'next/image';
import React, { useRef, useState } from 'react';
import Input from './Input';
import MessageViewer from '../messages/MessageViewer';
import styles from './DoubtSolver.module.css';
import { useDoubtSolverThreadStore } from '@/store/doubtSolverThreadStore';
import shifuIcon from '@/assets/bot/thinking.png';
import {
  applyLimits,
  MAX_CHARACTERS,
  MAX_WORDS,
  ThreadType,
} from '@/utils/thread';
import { useThreadController } from '@/hooks/useThreadController';
import { useAuthStore } from '@/store/authStore';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import { sendMessage, stopThread } from '@/service/thread.service';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';

export default function DoubtSolver({ roadmapId }) {
  const userDetails = useAuthStore((s) => s.userDetails);

  // const artifactData = useArtifactStore((s) => s.artifactData)

  const messages = useDoubtSolverThreadStore((s) => s.messages);
  const setMessages = useDoubtSolverThreadStore((s) => s.setMessages);
  const threadId = useDoubtSolverThreadStore((s) => s.threadId);
  const runId = useDoubtSolverThreadStore((s) => s.runId);
  const setRunId = useDoubtSolverThreadStore((s) => s.setRunId);
  const setThreadId = useDoubtSolverThreadStore((s) => s.setThreadId);
  const isThreadRunning = useDoubtSolverThreadStore((s) => s.isThreadRunning);
  const setIsThreadRunning = useDoubtSolverThreadStore(
    (s) => s.setIsThreadRunning,
  );
  const isOpen = useDoubtSolverThreadStore((s) => s.isOpen);
  const setIsOpen = useDoubtSolverThreadStore((s) => s.setIsOpen);

  const { isMobile } = useWindowDimensions();

  const [inputPlaceholder, setInputPlaceholder] = useState('Ask shifu . . .');
  const [isActiveApiCall, setIsActiveApiCall] = useState(false);
  const [queryInput, setQueryInput] = useState('');

  const inputRef = useRef(null);
  const pendingAssistantMessageIdRef = useRef(null);
  const {projectId} = useParams()

  const { connectStream } = useThreadController({
    email: userDetails?.email,
    setMessages,
    setIsThreadRunning,
    pendingAssistantMessageIdRef,
    handlers: {},
  });

  const handleInputChange = (e) => {
    const raw = e.target.value;
    const limited = applyLimits(raw, MAX_WORDS, MAX_CHARACTERS);
    setQueryInput(limited);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (queryInput.trim().length < 10) return;
      e.currentTarget.form.requestSubmit();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      setIsActiveApiCall(true);

      const userMessage = queryInput.trim();

      if (userMessage.length === 0) {
        return;
      }

      setQueryInput('');
      setIsThreadRunning(true);

      // Optimistic UI for user message and assistant response
      const tempId = `temp-${Date.now()}`;
      const tempAssistantId = `temp-assistant-${Date.now()}`;
      const newMessages = [
        {
          message_id: tempId,
          role: 'human',
          content: [
            {
              type: 'text',
              data: { text: userMessage },
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          message_id: tempAssistantId,
          role: 'assistant',
          content: [
            {
              type: 'text',
              data: {
                text: '',
              },
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      pendingAssistantMessageIdRef.current = tempAssistantId;

      setMessages([...messages, ...newMessages]);

      let data = {
        e: userDetails?.email,
        message: userMessage,
        roadmap_id: roadmapId,
        project_id: projectId
      };

      if (threadId) {
        data.thread_id = threadId;
      }

      const responseData = await sendMessage(data, ThreadType.ROADMAP_DOUBT);
      setRunId(responseData.run_id);
      if (!threadId) {
        setThreadId(responseData.thread_id);
      }
      setIsThreadRunning(true);
      connectStream(responseData.thread_id);
    } catch (error) {
      console.error(error);
      setIsThreadRunning(false);
      const filteredMessages = messages.filter(
        (m) => !m?.message_id?.startsWith('temp-assistant-'),
      );
      const updatedMessages = [
        ...filteredMessages,
        {
          message_id: `err-${Date.now()}`,
          role: 'assistant',
          content: [
            {
              type: 'text',
              payload: { text: 'Failed to send message. Please try again.' },
            },
          ],
          is_partial: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      setMessages(updatedMessages);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleStopThread = async () => {
    try {
      const response = await stopThread(threadId, runId);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleChatMinimization = () => {
    setIsOpen(!isOpen);
  };

  return (
    <motion.div
      className={`${styles['main-ct']} ${isMobile ? styles['mobile'] : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles['chat-head']}>
        <div className={styles['ch-left']}>
          <Image src={shifuIcon} alt="" />
          <span>Ask Shifu</span>
        </div>

        <MinimizeIcon onClick={toggleChatMinimization} />
      </div>
      <div className={styles['message-viewer-ct']}>
        <MessageViewer
          messages={messages}
          threadId={threadId}
          isThreadRunning={isThreadRunning}
        />
      </div>
      <div className={styles['input-ct']}>
        <Input
          inputPlaceholder={inputPlaceholder}
          inputRef={inputRef}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSendMessage={handleSendMessage}
          onCancel={handleStopThread}
          queryInput={queryInput}
          setQueryInput={setQueryInput}
          isThreadRunning={isThreadRunning}
          isActiveApiCall={isActiveApiCall}
        />
      </div>
    </motion.div>
  );
}

const ExpandIcon = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        d="M16.143 1.25C15.9441 1.25 15.7533 1.32902 15.6127 1.46967C15.472 1.61032 15.393 1.80109 15.393 2C15.393 2.19891 15.472 2.38968 15.6127 2.53033C15.7533 2.67098 15.9441 2.75 16.143 2.75H20.189L14.469 8.47C14.3324 8.61152 14.2569 8.801 14.2587 8.99765C14.2605 9.1943 14.3395 9.38237 14.4786 9.52136C14.6178 9.66035 14.8059 9.73914 15.0025 9.74076C15.1992 9.74237 15.3886 9.66669 15.53 9.53L21.25 3.81V7.857C21.25 8.05591 21.329 8.24668 21.4697 8.38733C21.6103 8.52798 21.8011 8.607 22 8.607C22.1989 8.607 22.3897 8.52798 22.5303 8.38733C22.671 8.24668 22.75 8.05591 22.75 7.857V2C22.75 1.80109 22.671 1.61032 22.5303 1.46967C22.3897 1.32902 22.1989 1.25 22 1.25H16.143ZM7.857 22.75C8.05591 22.75 8.24668 22.671 8.38733 22.5303C8.52798 22.3897 8.607 22.1989 8.607 22C8.607 21.8011 8.52798 21.6103 8.38733 21.4697C8.24668 21.329 8.05591 21.25 7.857 21.25H3.811L9.531 15.53C9.6026 15.4608 9.6597 15.378 9.69896 15.2865C9.73822 15.195 9.75886 15.0965 9.75968 14.9969C9.7605 14.8974 9.74148 14.7986 9.70372 14.7065C9.66597 14.6143 9.61024 14.5306 9.53979 14.4602C9.46934 14.3898 9.38557 14.3342 9.29338 14.2965C9.20119 14.2588 9.10242 14.2399 9.00284 14.2408C8.90326 14.2417 8.80485 14.2625 8.71337 14.3018C8.62188 14.3412 8.53915 14.3983 8.47 14.47L2.75 20.19V16.143C2.75 16.0445 2.7306 15.947 2.69291 15.856C2.65522 15.765 2.59997 15.6823 2.53033 15.6127C2.46069 15.543 2.37801 15.4878 2.28701 15.4501C2.19602 15.4124 2.09849 15.393 2 15.393C1.90151 15.393 1.80398 15.4124 1.71299 15.4501C1.62199 15.4878 1.53931 15.543 1.46967 15.6127C1.40003 15.6823 1.34478 15.765 1.30709 15.856C1.2694 15.947 1.25 16.0445 1.25 16.143V22C1.25 22.414 1.586 22.75 2 22.75H7.857Z"
        fill="#65758B"
      />
    </svg>
  );
};
const MinimizeIcon = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        d="M20.8569 9.75006C21.0559 9.75006 21.2466 9.67104 21.3873 9.53039C21.5279 9.38974 21.6069 9.19897 21.6069 9.00006C21.6069 8.80115 21.5279 8.61038 21.3873 8.46973C21.2466 8.32908 21.0559 8.25006 20.8569 8.25006H16.8109L22.5309 2.53006C22.6675 2.38854 22.743 2.19906 22.7412 2.00241C22.7394 1.80576 22.6604 1.61769 22.5213 1.4787C22.3822 1.33971 22.194 1.26092 21.9974 1.2593C21.8007 1.25769 21.6113 1.33337 21.4699 1.47006L15.7499 7.19006V3.14206C15.7499 2.94315 15.6709 2.75238 15.5303 2.61173C15.3896 2.47108 15.1989 2.39206 14.9999 2.39206C14.801 2.39206 14.6103 2.47108 14.4696 2.61173C14.329 2.75238 14.2499 2.94315 14.2499 3.14206V9.00006C14.2499 9.41406 14.5859 9.75006 14.9999 9.75006H20.8569ZM3.14294 14.2501C2.94403 14.2501 2.75327 14.3291 2.61261 14.4697C2.47196 14.6104 2.39294 14.8011 2.39294 15.0001C2.39294 15.199 2.47196 15.3897 2.61261 15.5304C2.75327 15.671 2.94403 15.7501 3.14294 15.7501H7.18894L1.46894 21.4701C1.39734 21.5393 1.34025 21.6221 1.30098 21.7136C1.26172 21.8051 1.24108 21.9035 1.24026 22.0031C1.23944 22.1027 1.25846 22.2015 1.29622 22.2936C1.33397 22.3858 1.3897 22.4695 1.46015 22.5399C1.53061 22.6102 1.61437 22.6659 1.70656 22.7036C1.79875 22.7412 1.89752 22.7602 1.9971 22.7592C2.09669 22.7583 2.19509 22.7376 2.28658 22.6982C2.37806 22.6589 2.46079 22.6017 2.52994 22.5301L8.24994 16.8101V20.8571C8.24994 21.056 8.32896 21.2467 8.46961 21.3874C8.61027 21.528 8.80103 21.6071 8.99994 21.6071C9.19885 21.6071 9.38962 21.528 9.53027 21.3874C9.67093 21.2467 9.74994 21.056 9.74994 20.8571V15.0001C9.74994 14.8011 9.67093 14.6104 9.53027 14.4697C9.38962 14.3291 9.19885 14.2501 8.99994 14.2501H3.14294Z"
        fill="#65758B"
      />
    </svg>
  );
};
