import sparkIcon from '@/assets/thread/magic-icon.svg';
import promptEditIcon from '@/assets/thread/prompt-edit.svg';
import scholarIcon from '@/assets/thread/scholar.svg';
import { useThreadController } from '@/hooks/useThreadController';
import { sendMessage } from '@/service/thread.service';
import { createThreadStreamHandlers } from '@/lib/threadStreamHandlers';
import { useAuthStore } from '@/store/authStore';
import { useThreadStore } from '@/store/threadStore';
import { ThreadType } from '@/utils/thread';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './Action.module.css';
import { saveRoadmapArtifact } from '@/service/artifact.service';
import { useParams, useRouter } from 'next/navigation';
import { useArtifactStore } from '@/store/artifactStore';
import bookmarkIcon from '@/assets/thread/bookmark.svg';
import { useDoubtSolverThreadStore } from '@/store/doubtSolverThreadStore';

const Action = ({ messageId, interationId, layout, data }) => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const isExistingChat = useThreadStore((s) => s.isExistingChat);
  const isArtifactOpen = useThreadStore((s) => s.isArtifactOpen);
  const threadId = useThreadStore((s) => s.threadId);
  const setRunId = useThreadStore((s) => s.setRunId);
  const setIsRoadmapCreated = useThreadStore((s) => s.setIsRoadmapCreated);
  const setSelectedTimeCommitment = useThreadStore(
    (s) => s.setSelectedTimeCommitment,
  );
  const messages = useThreadStore((s) => s.messages);
  const setMessages = useThreadStore((s) => s.setMessages);
  const setIsThreadRunning = useThreadStore((s) => s.setIsThreadRunning);
  const currentThreadMetadata = useThreadStore((s) => s.currentThreadMetadata);
  const setCurrentThreadMetadata = useThreadStore(
    (s) => s.setCurrentThreadMetadata,
  );

  const setArtifactMetadata = useArtifactStore((s) => s.setArtifactMetadata);

  const setDoubtSolverAgentRunId = useThreadStore((s) => s.setRunId);
  const dsAgentThreadId = useDoubtSolverThreadStore((s) => s.threadId);
  const doubtSolverAgentThreadmessages = useDoubtSolverThreadStore(
    (s) => s.messages,
  );
  const setDoubtSolverAgentThreadMessages = useDoubtSolverThreadStore(
    (s) => s.setMessages,
  );
  const setIsDoubtSolverAgentThreadRunning = useDoubtSolverThreadStore(
    (s) => s.setIsThreadRunning,
  );

  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [updatedPrompt, setUpdatedPrompt] = useState(data.title);
  const [isActiveApiCall, setIsActiveApiCall] = useState(false);
  const editTextareaRef = useRef(null);
  const pendingAssistantMessageIdRef = useRef(null);
  const pendingDSAgentAssistantMessageIdRef = useRef(null);

  const router = useRouter();
  const {projectId} = useParams(); 

  const { connectStream } = useThreadController({
    email: userDetails?.email,
    setMessages,
    setIsThreadRunning,
    pendingAssistantMessageIdRef,
    handlers: createThreadStreamHandlers(),
  });

  const { connectStream: doubtSolverAgentConnectStream } = useThreadController({
    email: userDetails?.email,
    setMessages: setDoubtSolverAgentThreadMessages, // Maps to expected key
    setIsThreadRunning: setIsDoubtSolverAgentThreadRunning, // Maps to expected key
    pendingAssistantMessageIdRef: pendingDSAgentAssistantMessageIdRef, // Maps to expected key
    handlers: createThreadStreamHandlers(),
  });

  const getActionIcon = (iconName) => {
    switch (iconName) {
      case 'edit':
        return promptEditIcon;
      case 'spark':
        return sparkIcon;
      case 'scholar':
        return scholarIcon;
      case 'bookmark':
        return bookmarkIcon;
      default:
        return null;
    }
  };

  const handleTimeCommitmentSend = async (actionData) => {
    setIsActiveApiCall(true);
    try {
      setIsThreadRunning(true);
      // optimistic UI (user message)
      const tempId = `temp-${crypto.randomUUID()}`;
      const tempAssistantId = `temp-assistant-${crypto.randomUUID()}`;
      const newMessages = [
        {
          message_id: tempId,
          role: 'human',
          content: [
            {
              type: 'text',
              data: { text: actionData.label },
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

      // api call
      const data = {
        e: userDetails?.email,
        message: actionData.label,
        thread_id: threadId,
        time_commitment: actionData.value,
        project_id: projectId
      };
      setSelectedTimeCommitment(actionData.value);

      const responseData = await sendMessage(
        data,
        ThreadType.ROADMAP_GENERATION,
      );
      setRunId(responseData.run_id);
      setCurrentThreadMetadata({
        ...currentThreadMetadata,
        time_commitment: { time_commitment: actionData.value, selected: true },
      });
      connectStream(responseData.thread_id);
    } catch (err) {
      console.error(err);
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

      setSelectedTimeCommitment(null);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleEditClick = () => {
    setIsEditingPrompt(!isEditingPrompt);
    setUpdatedPrompt(data.title);
  };

  const updatePromptInMessageLocal = (newPrompt, messages) => {
    return messages.map((msg) => {
      if (String(msg.message_id) !== String(messageId)) return msg;

      return {
        ...msg,
        content: msg.content.map((block) => {
          if (block.type !== 'action') return block;
          if (block.interaction_id !== interationId) return block;

          return {
            ...block,
            data: {
              ...block.data,
              title: newPrompt,
            },
          };
        }),
      };
    });
  };

  const handleGenerateRoadmap = async () => {
    setIsActiveApiCall(true);
    try {
      const isEdited = updatedPrompt !== data.title;
      setIsEditingPrompt(false);
      setIsThreadRunning(true);

      // optimistic UI (user message)
      const tempId = `temp-${crypto.randomUUID()}`;
      // optimistic assistant placeholder (shows loading spinner + shimmer text)
      const tempAssistantId = `temp-assistant-${crypto.randomUUID()}`;
      let updatedMessages = messages;

      if (isEdited) {
        updatedMessages = updatePromptInMessageLocal(
          updatedPrompt,
          updatedMessages,
        );
      }

      updatedMessages = [
        ...updatedMessages,
        {
          message_id: tempId,
          role: 'human',
          content: [
            {
              type: 'text',
              data: { text: 'Shifu, Generate my roadmap' },
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
              data: { text: '' },
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      pendingAssistantMessageIdRef.current = tempAssistantId;

      setMessages(updatedMessages);

      // api call
      const reqData = {
        e: userDetails?.email,
        message: 'Shifu, Generate my roadmap',
        thread_id: threadId,
        prompt: { text: updatedPrompt, edited: isEdited },
        project_id: projectId
      };

      const responseData = await sendMessage(
        reqData,
        ThreadType.ROADMAP_GENERATION,
      );
      setRunId(responseData.run_id);
      // setIsRoadmapCreated(true);
      connectStream(responseData.thread_id);
      setCurrentThreadMetadata({
        ...currentThreadMetadata,
        roadmap_created: true,
      });
    } catch (err) {
      console.error(err);
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

      setIsRoadmapCreated(false);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleCtacButtonClick = async (buttonData) => {
    if (buttonData.id === 'edit_prompt') {
      handleEditClick(buttonData);
    } else if (buttonData.id === 'generate_roadmap') {
      if (isEditingPrompt) {
        setIsEditingPrompt(!isEditingPrompt);
        return;
      }
      await handleGenerateRoadmap();
    } else {
      console.log('Another button');
    }
  };

  const handleGenerateContent = async (message_id, buttonData) => {
    setIsActiveApiCall(true);
    const lastMessage = messages[messages.length - 1];
    try {
      setIsThreadRunning(true);
      // optimistic UI (user message)
      // optimistic assistant placeholder (shows loading spinner + shimmer text)
      const tempAssistantId = lastMessage?.message_id;
      pendingAssistantMessageIdRef.current = undefined;

      let updated = [...messages];
      updated.pop();
      updated.push({
        message_id: tempAssistantId,
        role: 'assistant',
        content: [
          {
            type: 'text',
            data: { text: '' },
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setMessages(updated);

      // api call
      const reqData = {
        e: userDetails?.email,
        message: null,
        thread_id: threadId,
        m_id: message_id,
        action: 'generate_content',
        project_id: projectId
      };

      const responseData = await sendMessage(
        reqData,
        ThreadType.ROADMAP_GENERATION,
      );
      setRunId(responseData.run_id);
      connectStream(responseData.thread_id);

      let content_generated_status = 'partial_generation';
      if (
        buttonData.id === 'generate_content_proceed' ||
        currentThreadMetadata?.content_generated === 'partial_generation'
      ) {
        content_generated_status = 'complete_generation';
      }
      setCurrentThreadMetadata({
        ...currentThreadMetadata,
        content_generated: content_generated_status,
      });
    } catch (err) {
      console.error(err);

      setIsThreadRunning(false);
      const updatedMessages = (() => {
        let updated = [...messages];
        updated.pop();
        updated.push(lastMessage);
        return updated;
      })();
      setMessages(updatedMessages);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleRecommendCourse = async (message_id) => {
    setIsActiveApiCall(true);
    const lastMessage = messages[messages.length - 1];
    try {
      setIsThreadRunning(true);
      // optimistic UI (user message)
      // optimistic assistant placeholder (shows loading spinner + shimmer text)
      const tempAssistantId =
        currentThreadMetadata?.content_generated != 'partial_generation'
          ? lastMessage?.message_id
          : `temp-assistant-${crypto.randomUUID()}`;
      pendingAssistantMessageIdRef.current =
        currentThreadMetadata?.content_generated != 'partial_generation'
          ? undefined
          : tempAssistantId;

      let updated = [...messages];
      if (currentThreadMetadata?.content_generated != 'partial_generation') {
        updated.pop();
      }
      updated.push({
        message_id: tempAssistantId,
        role: 'assistant',
        content: [
          {
            type: 'text',
            data: { text: '' },
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setMessages(updated);

      // api call
      const reqData = {
        e: userDetails?.email,
        message: null,
        thread_id: threadId,
        m_id: message_id,
        action: 'recommend_courses',
        project_id: projectId
      };

      const responseData = await sendMessage(
        reqData,
        ThreadType.ROADMAP_GENERATION,
      );
      setRunId(responseData.run_id);
      connectStream(responseData.thread_id);
    } catch (err) {
      console.error(err);
      setIsThreadRunning(false);

      const updatedMessages = (() => {
        let updated = [...messages];
        updated.pop();
        updated.push(lastMessage);
        return updated;
      })();
      setMessages(updatedMessages);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleSaveRoadmap = async (messageId, buttonData) => {
    setIsActiveApiCall(true);
    const lastMessage = messages[messages.length - 1];
    try {
      // optimistic UI (user message)
      // optimistic assistant placeholder (shows loading spinner + shimmer text)
      const tempAssistantId = lastMessage?.message_id;
      pendingAssistantMessageIdRef.current = undefined;

      let updated = [...messages];
      updated.pop();
      updated.push({
        message_id: tempAssistantId,
        role: 'assistant',
        content: [
          {
            type: 'text',
            data: { text: '' },
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setMessages(updated);

      // api call
      setIsThreadRunning(true);
      connectStream(threadId);
      const responseData = await saveRoadmapArtifact(
        threadId,
        buttonData?.artifact_id,
        'chat',
        messageId,
      );

      if (responseData.status === 'success') {
        setArtifactMetadata((prev) => ({
          ...prev,
          saved: true,
        }));
      }
    } catch (err) {
      console.error(err);

      setIsThreadRunning(false);
      const updatedMessages = (() => {
        let updated = [...messages];
        updated.pop();
        updated.push(lastMessage);
        return updated;
      })();
      setMessages(updatedMessages);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleStartLearningClick = async (buttonData) => {
    const roadmapId = buttonData.roadmapId;
    router.push(`/project/${projectId}/roadmap/${buttonData.roadmap_id}`);
  };

  const handlePracButtonClick = async (buttonData) => {
    if (
      buttonData.id === 'generate_content' ||
      buttonData.id === 'generate_content_proceed'
    ) {
      await handleGenerateContent(messageId, buttonData);
    } else if (buttonData.id === 'recommend_courses') {
      await handleRecommendCourse(messageId);
    } else if (buttonData.id === 'save_roadmap') {
      await handleSaveRoadmap(messageId, buttonData);
    } else if (buttonData.id === 'start_learning') {
      await handleStartLearningClick(buttonData);
    } else {
      console.log('Another button');
    }
  };

  const handleRoadmapAgentRetry = async (buttonData) => {
    setIsActiveApiCall(true);
    const lastMessage = messages[messages.length - 1];
    try {
      setIsThreadRunning(true);
      // optimistic assistant placeholder (shows loading spinner + shimmer text)
      const tempAssistantId = lastMessage?.message_id;
      pendingAssistantMessageIdRef.current = tempAssistantId;

      let updated = [...messages];
      updated.pop();
      updated.push({
        message_id: tempAssistantId,
        role: 'assistant',
        content: [
          {
            type: 'text',
            data: { text: '' },
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setMessages(updated);

      // api call
      const reqData = {
        e: userDetails?.email,
        thread_id: threadId,
        message: null,
        m_id: buttonData?.extra?.m_id,
        action: buttonData?.extra?.action,
        retry: true,
        project_id: projectId
      };

      const responseData = await sendMessage(
        reqData,
        ThreadType.ROADMAP_GENERATION,
      );
      setRunId(responseData.run_id);
      connectStream(responseData.thread_id);
    } catch (err) {
      console.error(err);
      setIsThreadRunning(false);

      const updatedMessages = (() => {
        let updated = [...messages];
        updated.pop();
        updated.push(lastMessage);
        return updated;
      })();
      setMessages(updatedMessages);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleDoubtSolverAgentRetry = async (buttonData) => {
    setIsActiveApiCall(true);
    const lastMessage =
      doubtSolverAgentThreadmessages[doubtSolverAgentThreadmessages.length - 1];
    try {
      // optimistic assistant placeholder (shows loading spinner + shimmer text)
      const tempAssistantId = lastMessage?.message_id;
      pendingDSAgentAssistantMessageIdRef.current = tempAssistantId;

      let updated = [...doubtSolverAgentThreadmessages];
      updated.pop();
      updated.push({
        message_id: tempAssistantId,
        role: 'assistant',
        content: [
          {
            type: 'text',
            data: { text: '' },
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setDoubtSolverAgentThreadMessages(updated);

      // api call
      const reqData = {
        e: userDetails?.email,
        thread_id: dsAgentThreadId,
        message: null,
        m_id: buttonData?.extra?.m_id,
        action: buttonData?.extra?.action,
        roadmap_id: buttonData?.extra?.roadmap_id,
        retry: true,
        project_id: projectId
      };

      const responseData = await sendMessage(reqData, ThreadType.ROADMAP_DOUBT);
      setDoubtSolverAgentRunId(responseData.run_id);
      setIsDoubtSolverAgentThreadRunning(true);
      doubtSolverAgentConnectStream(responseData.thread_id);
    } catch (err) {
      console.error(err);
      setIsDoubtSolverAgentThreadRunning(false);

      const updatedMessages = (() => {
        let updated = [...messages];
        updated.pop();
        updated.push(lastMessage);
        return updated;
      })();
      setDoubtSolverAgentThreadMessages(updatedMessages);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleRetryButtonClick = async (buttonData) => {
    if (buttonData.type === ThreadType.ROADMAP_GENERATION) {
      await handleRoadmapAgentRetry(buttonData);
    } else if (buttonData.type === ThreadType.ROADMAP_DOUBT) {
      await handleDoubtSolverAgentRetry(buttonData);
    }
  };

  useEffect(() => {
    if (isEditingPrompt && editTextareaRef?.current) {
      const textareaElement = editTextareaRef.current;
      textareaElement.rows = 1;
      textareaElement.style.height = 'auto';
      const MAX_HEIGHT = 200;
      const scrollHeight = textareaElement.scrollHeight;
      textareaElement.style.height = Math.min(MAX_HEIGHT, scrollHeight) + 'px';

      textareaElement.style.overflowY = 'auto';
      textareaElement?.focus();
      const textLength = textareaElement.value.length;
      textareaElement.setSelectionRange(textLength, textLength);
    }
  }, [isEditingPrompt]);

  return (
    <div>
      {layout === 'call_to_action_card' && (
        <div
          className={`${styles['ctac-ct']} ${isArtifactOpen && isExistingChat ? styles['side-layout'] : ''}`}
        >
          {data.title &&
            (!isEditingPrompt ? (
              <div className={styles['ctac-action-title']}>{data.title}</div>
            ) : (
              <textarea
                name="prompt-edit-box"
                id="prompt-edit-box"
                className={styles['ctac-action-title']}
                value={updatedPrompt}
                onChange={(e) => setUpdatedPrompt(e.target.value)}
                ref={editTextareaRef}
              ></textarea>
            ))}
          <div className={styles['ctac-action-ct']}>
            {data.options.map((option, idx) => {
              const isGenerateRoadmapOption = option.id === 'generate_roadmap';
              const isEditOption = option.id === 'edit_prompt';
              const isEditing = isEditOption && isEditingPrompt;

              const icon = isEditOption
                ? getActionIcon(isEditing ? 'cancel' : 'edit')
                : getActionIcon(option.icon);

              const label = isEditOption
                ? isEditing
                  ? 'Cancel'
                  : option.label
                : isGenerateRoadmapOption && isEditingPrompt
                  ? 'Save'
                  : option.label;

              return (
                <button
                  key={idx}
                  className={`${styles['ctac-action-btn']} ${
                    ['generate_roadmap'].includes(option.id)
                      ? styles['primary-action-cta']
                      : ''
                  }`}
                  onClick={() => handleCtacButtonClick(option)}
                  disabled={
                    currentThreadMetadata?.roadmap_created || isActiveApiCall
                  }
                >
                  {icon && <Image src={icon} alt="" />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {layout === 'chip_list' && (
        <div className={styles['chip-list']}>
          {data.title && <div>{data.title}</div>}
          {data.options.map((option, idx) => (
            <button
              key={idx}
              className={`${styles['chip']} ${currentThreadMetadata?.time_commitment?.value === option.value ? styles['selected'] : ''}`}
              onClick={() => handleTimeCommitmentSend(option)}
              disabled={
                currentThreadMetadata?.time_commitment?.selected ||
                isActiveApiCall
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {layout === 'post_roadmap_action_cta' && (
        <div
          className={`${styles['prac-ct']} ${isArtifactOpen && isExistingChat ? styles['side-layout'] : ''}`}
        >
          <div className={styles['prac-action-ct']}>
            {data.options.map((option, idx) => {
              const icon = getActionIcon(option.icon);
              const label = option.label;
              return (
                <button
                  key={idx}
                  className={`${styles['prac-action-btn']} ${
                    styles['primary-action-cta']
                  }`}
                  onClick={() => handlePracButtonClick(option)}
                >
                  {icon && <Image src={icon} alt="" />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {layout === 'error_cta' && (
        <div
          className={`${styles['error-ac-ct']} ${isArtifactOpen && isExistingChat ? styles['side-layout'] : ''}`}
        >
          {data.title && (
            <div className={styles['error-action-title']}>{data.title}</div>
          )}
          <div className={styles['error-action-ct']}>
            {data.options.map((option, idx) => (
              <button
                key={idx}
                className={`${styles['error-action-btn']}`}
                onClick={() => handleRetryButtonClick(option)}
                disabled={isActiveApiCall}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Action;
