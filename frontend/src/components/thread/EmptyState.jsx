'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import styles from './EmptyState.module.css';
import shifuIcon from '@/assets/bot/thinking.png';
import Input from './Input';
import PromptTemplates from './PromptTemplates';
import { useThreadStore } from '@/store/threadStore';
import {
  applyLimits,
  MAX_CHARACTERS,
  MAX_WORDS,
  PROMPT_TEMPLATES,
  ThreadType,
} from '@/utils/thread';
import { useThreadController } from '@/hooks/useThreadController';
import { useAuthStore } from '@/store/authStore';
import { sendMessage } from '@/service/thread.service';
import { useRouter } from 'next/navigation';
import { createThreadStreamHandlers } from '@/lib/threadStreamHandlers';
import { motion } from 'framer-motion';
import { useSidebarStore } from '@/store/sidebarStore';

const EmptyState = ({projectId}) => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const threadId = useThreadStore((s) => s.threadId);
  const setRunId = useThreadStore((s) => s.setRunId);
  const setThreadId = useThreadStore((s) => s.setThreadId);
  const queryInput = useThreadStore((s) => s.queryInput);
  const setQueryInput = useThreadStore((s) => s.setQueryInput);
  const isExistingChat = useThreadStore((s) => s.isExistingChat);
  const setIsExistingChat = useThreadStore((s) => s.setIsExistingChat);
  const messages = useThreadStore((s) => s.messages);
  const setMessages = useThreadStore((s) => s.setMessages);
  const setCurrentThreadTitle = useThreadStore((s) => s.setCurrentThreadTitle);
  const setIsThreadRunning = useThreadStore((s) => s.setIsThreadRunning);
  const threadReset = useThreadStore((s) => s.reset);

  const threads = useSidebarStore((s) => s.threads);
  const setThreads = useSidebarStore((s) => s.setThreads);

  const [inputPlaceholder, setInputPlaceholder] = useState('Answer here....');
  const [isActiveApiCall, setIsActiveApiCall] = useState(false);

  const inputRef = useRef(null);
  const pendingAssistantMessageIdRef = useRef(null);

  const router = useRouter();

  const { connectStream } = useThreadController({
    email: userDetails?.email,
    setMessages,
    setIsThreadRunning,
    pendingAssistantMessageIdRef,
    handlers: createThreadStreamHandlers(),
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
      // setIsExistingChat(true);
      setCurrentThreadTitle(userMessage);
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
        project_id: projectId
      };

      if (threadId) {
        data.thread_id = threadId;
      }

      const responseData = await sendMessage(
        data,
        ThreadType.ROADMAP_GENERATION,
      );
      setRunId(responseData.run_id);
      if (!threadId) {
        setThreadId(responseData.thread_id);
        router.push(`/project/${projectId}/shifu/${responseData.thread_id}`);
        setIsThreadRunning(true);
        await connectStream(responseData.thread_id);
        setThreads([
          {
            slug: threadId,
            title: userMessage,
            saved: false,
            updated_at: new Date().toUTCString(),
          },
          ...threads,
        ]);
      }
    } catch (error) {
      console.error(error);
      // setIsExistingChat(false);
      setCurrentThreadTitle('Untitled');
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

  useEffect(() => {
    const pendingPrompt =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('pending_roadmap_prompt')
        : null;
    const currentInput = useThreadStore.getState().queryInput;

    threadReset();

    if (pendingPrompt) {
      setQueryInput(pendingPrompt);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pending_roadmap_prompt');
      }
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else if (currentInput) {
      setQueryInput(currentInput);
    }
  }, []);

  return (
    <div className={`${styles['section']}`}>
      <div className={styles['section-inner-head']}>
        <motion.div
          className={styles['cs-head']}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <Image src={shifuIcon} loading="eager" alt="" />
          <span className={styles['head-text']}>
            What do you want to Accomplish?
          </span>
        </motion.div>
        <motion.div
          className={styles['message-input-ct']}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <Input
            inputPlaceholder={inputPlaceholder}
            inputRef={inputRef}
            queryInput={queryInput}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSendMessage={handleSendMessage}
            isActiveApiCall={isActiveApiCall}
          />
        </motion.div>
      </div>
      <PromptTemplates
        data={PROMPT_TEMPLATES}
        setInputPlaceholder={setInputPlaceholder}
        setQueryInput={setQueryInput}
        inputRef={inputRef}
      />
    </div>
  );
};

export default EmptyState;
