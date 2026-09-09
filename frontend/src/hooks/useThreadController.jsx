import { upsertMessage } from '@/lib/messageManager';
import { sseManager } from '@/lib/sseManager';
import { processStreamEvent } from '@/lib/streamEventProcessor';

export const useThreadController = ({
  email,
  setMessages,
  setIsThreadRunning,
  pendingAssistantMessageIdRef,
  handlers,
}) => {
  const connectStream = async (threadId) => {
    await sseManager.connect({
      threadId,
      email,

      onMessage: (data) => {
        setMessages((prev) =>
          upsertMessage(prev, data, pendingAssistantMessageIdRef),
        );

        processStreamEvent(data, handlers);
      },

      onError: (err) => {
        console.error('Stream error', err);
        setIsThreadRunning(false);
      },

      onDone: () => {
        console.log('Thread finished');
        setIsThreadRunning(false);
      },
    });
  };

  const closeStream = () => {
    sseManager.close();
  };

  return {
    connectStream,
    closeStream,
  };
};
