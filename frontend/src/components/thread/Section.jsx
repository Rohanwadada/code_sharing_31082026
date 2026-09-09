'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Section.module.css';
import { useThreadStore } from '@/store/threadStore';
import Input from './Input';
import {
  applyLimits,
  MAX_CHARACTERS,
  MAX_WORDS,
  ThreadType,
} from '@/utils/thread';
import MessageViewer from '../messages/MessageViewer';
import Image from 'next/image';
import shifuIcon from '@/assets/bot/thinking.png';
import { useAuthStore } from '@/store/authStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useThreadController } from '@/hooks/useThreadController';
import {
  emailRoadmapArtifact,
  sendMessage,
  stopThread,
} from '@/service/thread.service';
import { createThreadStreamHandlers } from '@/lib/threadStreamHandlers';
import Skeleton from '../utility/Skeleton';
import ArtifactViewer from '../artifacts/ArtifactViewer';
import { useArtifactStore } from '@/store/artifactStore';
import { getRoadmapAttachment } from '@/utils/artifact';
import { useNotification } from '@/hooks/useNotification';
import { v4 as uuid4 } from 'uuid';
import { useDoubtSolverThreadStore } from '@/store/doubtSolverThreadStore';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import { saveRoadmapArtifact } from '@/service/artifact.service';
import { useSidebarStore } from '@/store/sidebarStore';
import { getThreadMessages as getThreadMessagesApi } from '@/service/thread.service';

const Section = ({ threadIdFromUrl = null, projectId }) => {
  const userDetails = useAuthStore((s) => s.userDetails);

  const isSidebarOpen = useSidebarStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useSidebarStore((s) => s.setIsSidebarOpen);
  const threadId = useThreadStore((s) => s.threadId);
  const runId = useThreadStore((s) => s.runId);
  const setRunId = useThreadStore((s) => s.setRunId);
  const setThreadId = useThreadStore((s) => s.setThreadId);
  const messages = useThreadStore((s) => s.messages);
  const setMessages = useThreadStore((s) => s.setMessages);
  const setCurrentThreadTitle = useThreadStore((s) => s.setCurrentThreadTitle);
  const setCurrentThreadMetadata = useThreadStore(
    (s) => s.setCurrentThreadMetadata,
  );
  const isArtifactOpen = useThreadStore((s) => s.isArtifactOpen);
  const isExistingChat = useThreadStore((s) => s.isExistingChat);
  const setIsExistingChat = useThreadStore((s) => s.setIsExistingChat);
  const chatMinimized = useThreadStore((s) => s.chatMinimized);
  const setChatMinimized = useThreadStore((s) => s.setChatMinimized);
  const queryInput = useThreadStore((s) => s.queryInput);
  const setQueryInput = useThreadStore((s) => s.setQueryInput);
  const isRoadmapCreated = useThreadStore((s) => s.isRoadmapCreated);
  const setIsRoadmapCreated = useThreadStore((s) => s.setIsRoadmapCreated);
  const setIsUserApproved = useThreadStore((s) => s.setIsUserApproved);
  const setIsArtifactOpen = useThreadStore((s) => s.setIsArtifactOpen);

  const isThreadRunning = useThreadStore((s) => s.isThreadRunning);
  const setIsThreadRunning = useThreadStore((s) => s.setIsThreadRunning);
  const availableArtifacts = useThreadStore((s) => s.availableArtifacts);
  const setAvailableArtifacts = useThreadStore((s) => s.setAvailableArtifacts);

  const mobileTab = useThreadStore((s) => s.mobileTab);
  const setMobileTab = useThreadStore((s) => s.setMobileTab);
  const saveThread = useThreadStore((s) => s.saveThread);

  const artifactId = useArtifactStore((s) => s.artifactId);
  const artifactType = useArtifactStore((s) => s.artifactType);
  const artifactData = useArtifactStore((s) => s.artifactData);
  const artifactMetadata = useArtifactStore((s) => s.artifactMetadata);
  const setArtifactMetadata = useArtifactStore((s) => s.setArtifactMetadata);
  const threadReset = useThreadStore((s) => s.reset);

  const setArtifactId = useArtifactStore((s) => s.setArtifactId);
  const artifactStoreReset = useArtifactStore((s) => s.reset);
  const isArtifactSaved = useArtifactStore(
    (s) => s.artifactMetadata?.saved || false,
  );

  const isDoubtSolverSectionOpen = useDoubtSolverThreadStore((s) => s.isOpen);

  const {
    showLoadingNotification,
    resolveNotification,
    rejectNotification,
    showNotification,
  } = useNotification();

  const { isMobile } = useWindowDimensions();

  const [inputPlaceholder, setInputPlaceholder] = useState('Answer here....');
  const [isActiveApiCall, setIsActiveApiCall] = useState(false);
  const [isThreadFetching, setIsThreadFetching] = useState(false);

  const inputRef = useRef(null);
  const pendingAssistantMessageIdRef = useRef(null);

  const router = useRouter();
  const searchParams = useSearchParams();

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
      setIsExistingChat(true);
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
      // if (!threadId) {
      setRunId(responseData.run_id);
      setThreadId(responseData.thread_id);
      // router.push(`/shifu/${responseData.thread_id}`, { replace: true });
      connectStream(responseData.thread_id);
      // }
    } catch (error) {
      console.error(error);
      setIsExistingChat(false);
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
    setChatMinimized(!chatMinimized);
  };

  const getThreadMessages = async (threadId) => {
    setIsThreadFetching(true);
    try {
      const responseData = await getThreadMessagesApi(threadId);

      setMessages(responseData?.messages || []);
      setCurrentThreadTitle(responseData?.thread_title || 'Untitled');
      setCurrentThreadMetadata(responseData?.metadata || {});
      setIsExistingChat(true);
      setIsRoadmapCreated(responseData?.roadmap_created || false);
      setIsUserApproved(responseData?.user_approved || false);
      setIsThreadRunning(
        ['pending', 'running'].includes(
          responseData?.metadata?.status || 'pending',
        ),
      );
      setAvailableArtifacts(responseData?.artifacts || []);
      if (
        ['pending', 'running'].includes(
          responseData?.metadata?.status || 'pending',
        )
      ) {
        // Optimistic UI for user message and assistant response
        const tempAssistantId = `temp-assistant-${Date.now()}`;
        const newMessages = [
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

        setMessages([...responseData?.messages, ...newMessages]);
        connectStream(threadId);
      }
    } catch (err) {
      console.log(err);

      setIsExistingChat(false);
      threadReset();
      artifactStoreReset();
      router.push(`/project/${projectId}/shifu`);
    } finally {
      setIsThreadFetching(false);
    }
  };

  const handleTabChange = (tabName) => {
    if (tabName === 'canvas' && !isArtifactOpen) {
      setIsArtifactOpen(true);
    } else if (tabName === 'chat') {
      setIsArtifactOpen(false);
    }
    setMobileTab(tabName);
  };

  const handleEmailRoadmap = async () => {
    if (isActiveApiCall) return;
    const toastId = uuid4();
    showLoadingNotification(toastId, 'Sending roadmap. Please wait');
    try {
      setIsActiveApiCall(true);

      const roadmapAttachment = await getRoadmapAttachment('pdf');

      console.log('Attachment: ', roadmapAttachment);

      const formData = new FormData();
      formData.append('e', userDetails?.email);
      formData.append('t_id', threadId);
      formData.append('attachment', roadmapAttachment);

      const response = await emailRoadmapArtifact(
        threadId,
        userDetails?.email,
        roadmapAttachment,
      );

      resolveNotification(toastId, 'Roadmap sent to your email');
    } catch (error) {
      console.error(error);
      rejectNotification(toastId, 'Something went wrong. Please try again');
    } finally {
      setIsActiveApiCall(false);
    }
  };

  const handleSaveRoadmap = async () => {
    if (isActiveApiCall) return;
    try {
      setIsActiveApiCall(true);
      const response = await saveRoadmapArtifact(
        threadId,
        artifactId,
        'artifact',
      );
      if (response.status === 'success') {
        setArtifactMetadata((prev) => ({
          ...prev,
          saved: true,
        }));
      }
    } catch (error) {
      console.error(error);
      showNotification('error', error.message);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  useEffect(() => {
    if (!threadIdFromUrl) return;

    if (messages.length > 0 && threadIdFromUrl === threadId) {
      setIsExistingChat(true);
      return;
    }

    if (threadIdFromUrl !== threadId) {
      setThreadId(threadIdFromUrl);
    }
    getThreadMessages(threadIdFromUrl);
  }, [threadIdFromUrl]);

  // Open the first artifact when the `openArtifact` query param is `true`
  useEffect(() => {
    const openArtifact = searchParams.get('openArtifact');

    if (
      openArtifact &&
      openArtifact === 'true' &&
      availableArtifacts.length != 0
    ) {
      console.log('Check passed. . . ');
      console.log('available artifacts, ', availableArtifacts);

      setIsArtifactOpen(true);
      setArtifactId(availableArtifacts[0]?.a_id);
      // setArtifactType(subtype)
      // setArtifactData(data);
      setMobileTab('canvas');
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    }
  }, [searchParams, availableArtifacts]);

  if (isThreadFetching) {
    return <ThreadSkeleton />;
  }

  return (
    <div className={`${styles['section']}`}>
      <div
        className={`${styles['section-inner']} ${isArtifactOpen ? styles['side-layout'] : ''}`}
      >
        {!isDoubtSolverSectionOpen && (
          <div
            className={`${styles['chat-section-inner']} ${isExistingChat ? styles['existing-chat'] : ''} ${chatMinimized ? styles['mini-view'] : ''} ${styles['mobile-layer']} ${mobileTab === 'canvas' ? styles['hide-on-mobile'] : styles['show-on-mobile']}`}
          >
            {isArtifactOpen && (
              <div className={styles['chat-head']}>
                <Image src={shifuIcon} alt="" />
                {chatMinimized ? (
                  <ExpandIcon onClick={toggleChatMinimization} />
                ) : (
                  <MinimizeIcon onClick={toggleChatMinimization} />
                )}
              </div>
            )}

            {isExistingChat && !chatMinimized && (
              <MessageViewer
                messages={messages}
                threadId={threadId}
                isThreadRunning={isThreadRunning}
              />
            )}

            {chatMinimized && isExistingChat && isArtifactOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="21"
                height="20"
                viewBox="0 0 21 20"
                fill="none"
                className={styles['message-icon']}
              >
                <path
                  d="M6 6H15M6 9H10.5M0.75 10.51C0.75 12.11 1.873 13.504 3.457 13.737C4.586 13.903 5.727 14.03 6.88 14.116C7.23 14.142 7.55 14.326 7.745 14.617L10.5 18.75L13.255 14.617C13.3516 14.4733 13.4798 14.3534 13.6297 14.2666C13.7795 14.1798 13.9472 14.1283 14.12 14.116C15.2652 14.0305 16.4069 13.9041 17.543 13.737C19.127 13.504 20.25 12.111 20.25 10.509V4.491C20.25 2.889 19.127 1.496 17.543 1.263C15.211 0.920716 12.857 0.74926 10.5 0.750002C8.108 0.750002 5.756 0.925002 3.457 1.263C1.873 1.496 0.75 2.89 0.75 4.491V10.509V10.51Z"
                  stroke="#65758B"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <Input
                inputPlaceholder={inputPlaceholder}
                inputRef={inputRef}
                queryInput={queryInput}
                onInputChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onSendMessage={handleSendMessage}
                onCancel={handleStopThread}
                isActiveApiCall={isActiveApiCall}
              />
            )}

            {isExistingChat && !chatMinimized && !isSidebarOpen && (
              <div
                className={styles['mobile-nav-bar']}
                style={{ justifyContent: 'center' }}
              >
                <div className={styles['mobile-nav-bar-toggle']}>
                  <button
                    className={`${styles['mobile-nav-bar-btn']} ${mobileTab === 'chat' ? styles['active'] : ''}`}
                    onClick={() => handleTabChange('chat')}
                  >
                    Chat
                  </button>
                  <button
                    className={`${styles['mobile-nav-bar-btn']} ${mobileTab === 'canvas' ? styles['active'] : ''}`}
                    onClick={() => handleTabChange('canvas')}
                    disabled={!artifactData}
                  >
                    Canvas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* {isArtifactOpen && (*/}
        <div
          className={`${styles['artifact-viewer-container']} ${styles['mobile-layer']} ${mobileTab === 'chat' ? styles['hide-on-mobile'] : styles['show-on-mobile']}`}
        >
          <ArtifactViewer />

          {/* Mobile navbar pinned to bottom of the canvas white box */}
          {isExistingChat && !chatMinimized && !isSidebarOpen && (
            <div
              className={`${styles['mobile-nav-bar']} ${artifactMetadata?.generation_status === 'complete' && artifactType === 'roadmap' ? styles['complete'] : ''}`}
            >
              {artifactMetadata?.generation_status === 'complete' &&
                artifactType === 'roadmap' && (
                  <button
                    className={styles['mobile-nav-bar-action']}
                    type="button"
                    onClick={handleEmailRoadmap}
                    disabled={isActiveApiCall}
                  >
                    <MailIcon />
                    <span className={styles['mobile-nav-bar-action-text']}>
                      Send to Email
                    </span>
                  </button>
                )}
              <div className={styles['mobile-nav-bar-toggle']}>
                <button
                  className={`${styles['mobile-nav-bar-btn']} ${mobileTab === 'chat' ? styles['active'] : ''}`}
                  onClick={() => handleTabChange('chat')}
                >
                  <span>Chat</span>
                </button>
                <button
                  className={`${styles['mobile-nav-bar-btn']} ${mobileTab === 'canvas' ? styles['active'] : ''}`}
                  onClick={() => handleTabChange('canvas')}
                  disabled={!artifactData}
                >
                  <span>Canvas</span>
                </button>
              </div>
              {artifactMetadata?.generation_status === 'complete' &&
                artifactType === 'roadmap' && (
                  <button
                    className={styles['mobile-nav-bar-action']}
                    type="button"
                    onClick={handleSaveRoadmap}
                  >
                    <SaveIcon fill={isArtifactSaved ? '#00f0ff' : 'none'} />
                    <span className={styles['mobile-nav-bar-action-text']}>
                      {isArtifactSaved ? 'Saved' : 'Save'}
                    </span>
                  </button>
                )}
            </div>
          )}
        </div>
        {/* )}*/}
      </div>

      {/* {isDoubtSolverSectionOpen && !isMobile && <DoubtSolver />}*/}
    </div>
  );
};

const ThreadSkeleton = () => {
  const Bubble = ({ side = 'left', lines = [0.75, 0.55, 0.4], withAvatar }) => (
    <div
      className={`${styles['sk-row']} ${side === 'right' ? styles['sk-row-right'] : styles['sk-row-left']}`}
    >
      {withAvatar && <Skeleton variant="avatar" width={36} height={36} />}

      <div className={styles['sk-bubble']}>
        <div className={styles['sk-lines']}>
          {lines.map((w, i) => (
            <Skeleton
              key={i}
              height={14}
              width={`${Math.round(w * 100)}%`}
              animationType="wave"
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles['section']}>
      <div className={`${styles['chat-section-inner']} ${styles['sk-chat']}`}>
        <div className={styles['sk-messages']}>
          <Bubble side="left" withAvatar lines={[0.65, 0.45]} />
          <Bubble side="right" lines={[0.8, 0.6, 0.35]} />
          <Bubble side="left" withAvatar lines={[0.55, 0.75]} />
          <Bubble side="right" lines={[0.7, 0.5]} />
          <Bubble side="left" withAvatar lines={[0.85, 0.55, 0.25]} />
          <Bubble side="right" lines={[0.8, 0.6, 0.35]} />
        </div>

        <div className={styles['sk-input']}>
          <Skeleton variant="input" height={44} />
        </div>
      </div>
    </div>
  );
};

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

const MailIcon = ({ width = 18, height = 18, ...props }) => (
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
    <path
      d="M20.25 3V13.5C20.25 14.0967 20.0129 14.669 19.591 15.091C19.169 15.5129 18.5967 15.75 18 15.75H3C2.40326 15.75 1.83097 15.5129 1.40901 15.091C0.987053 14.669 0.75 14.0967 0.75 13.5V3M20.25 3C20.25 2.40326 20.0129 1.83097 19.591 1.40901C19.169 0.987053 18.5967 0.75 18 0.75H3C2.40326 0.75 1.83097 0.987053 1.40901 1.40901C0.987053 1.83097 0.75 2.40326 0.75 3M20.25 3V3.243C20.25 3.62715 20.1517 4.00491 19.9644 4.3403C19.7771 4.67569 19.5071 4.95754 19.18 5.159L11.68 9.774C11.3252 9.99253 10.9167 10.1082 10.5 10.1082C10.0833 10.1082 9.67479 9.99253 9.32 9.774L1.82 5.16C1.49292 4.95854 1.22287 4.67669 1.03557 4.3413C0.848269 4.00591 0.749957 3.62815 0.75 3.244V3"
      stroke="#485363"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SaveIcon = ({ width = 18, height = 18, ...props }) => (
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
    <path
      d="M17.593 3.322C18.693 3.45 19.5 4.399 19.5 5.507V21L12 17.25L4.5 21V5.507C4.5 4.399 5.306 3.45 6.407 3.322C10.1232 2.89063 13.8768 2.89063 17.593 3.322Z"
      stroke="#485363"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default Section;
