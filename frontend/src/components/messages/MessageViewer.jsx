import styles from './MessageViewer.module.css';
import HumanMessage from './HumanMessage';
import AssistantMessage from './AssistantMessage';
import { useThreadStore } from '@/store/threadStore';
import { useEffect, useMemo, useRef, useState } from 'react';

const MessageViewer = ({ messages, threadId, isThreadRunning }) => {
  // const messages = useThreadStore((s) => s.messages);
  // const isThreadRunning = useThreadStore((s) => s.isThreadRunning);

  const containerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // const lastAssistantIdx = (() => {
  //   for (let i = messages.length - 1; i >= 0; i--) {
  //     if (messages[i]?.role === "assistant") return i;
  //   }
  //   return -1;
  // })();

  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'assistant') {
        return i;
      }
    }
    return -1;
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const threshold = 100; // px from bottom
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    setIsAtBottom(atBottom);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isAtBottom) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: isThreadRunning ? 'smooth' : 'auto',
      });
    }
  }, [messages, isAtBottom]);

  return (
    <div
      className={styles['chat-ct']}
      ref={containerRef}
      onScroll={handleScroll}
    >
      <div className={styles['chat-ct-inner']}>
        {messages.map((msg, idx) => {
          return msg.role === 'human' ? (
            <HumanMessage key={`human_${idx}`} message={msg} />
          ) : (
            <AssistantMessage
              key={`assistant_${idx}`}
              message={msg}
              threadId={threadId}
              showLoading={isThreadRunning && idx === lastAssistantIdx}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MessageViewer;
