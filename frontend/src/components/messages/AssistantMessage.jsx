import styles from './AssistantMessage.module.css';
import loadingIcon from '@/assets/thread/loading-icon.gif';
import shifuDefaultIcon from '@/assets/bot/default.png';
import shifuIcon from '@/assets/bot/thinking.png';
import Artifact from './content-viewer/Artifact';
import Action from './content-viewer/Action';
import Text from './content-viewer/Text';
import Image from 'next/image';
import { sendMessageFeedback } from '@/service/thread.service';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const AssistantMessage = ({ message, threadId, showLoading }) => {
  const useDetails = useAuthStore((s) => s.userDetails);

  console.log(message?.metadata?.feedback);

  const [messageFeedback, setMessageFeedback] = useState(
    message?.metadata?.feedback || null,
  );
  const [isActiveApiCall, setIsActiveApiCall] = useState(false);

  const handleFeedback = async (chosenFeedback) => {
    try {
      if (chosenFeedback === messageFeedback || isActiveApiCall) return;
      setIsActiveApiCall(true);
      setMessageFeedback(chosenFeedback === 'like' ? 1 : 0);

      const response = await sendMessageFeedback(
        threadId,
        message.message_id,
        chosenFeedback,
      );
    } catch (error) {
      console.error(error);
      setMessageFeedback(null);
    } finally {
      setIsActiveApiCall(false);
    }
  };

  return (
    <div className={styles['ai-message-ct']}>
      <div className={styles['ai-message']}>
        <div className={styles['shifu-icon']}>
          <Image
            src={message?.status === 'loading' ? shifuIcon : shifuDefaultIcon}
            alt=""
          />
        </div>

        <div className={styles['message-content-ct']}>
          {message.content.map((c, idx) => {
            switch (c.type) {
              case 'text':
                return <Text key={idx} text={c.data.text} />;

              case 'artifact':
                return (
                  <Artifact
                    key={idx}
                    artifactId={c.artifact_id}
                    subtype={c.subtype}
                    data={c.data}
                  />
                );

              case 'action':
                return (
                  <Action
                    key={idx}
                    messageId={message.message_id}
                    interationId={c.interaction_id}
                    layout={c.layout}
                    data={c.data}
                  />
                );

              default:
                return null;
            }
          })}
          {showLoading && (
            <Image
              className={styles['loading-icon']}
              src={loadingIcon}
              alt=""
            />
          )}
          {!showLoading && (
            <span className={styles['action-ct']}>
              <Like
                onClick={() => handleFeedback('like')}
                fill={messageFeedback === 1 ? '#00f0ff' : 'none'}
                stroke={messageFeedback === 1 ? '#00f0ff' : 'black'}
              />
              <DisLike
                onClick={() => handleFeedback('dislike')}
                fill={messageFeedback === 0 ? '#00f0ff' : 'none'}
                stroke={messageFeedback === 0 ? '#00f0ff' : 'black'}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const Like = ({ width = 24, height = 24, ...props }) => {
  const fillPath =
    'M6.633 10.25C7.439 10.25 8.166 9.804 8.664 9.17C9.44026 8.17962 10.4147 7.36218 11.525 6.77C12.248 6.386 12.875 5.814 13.178 5.055C13.3908 4.52325 13.5001 3.95575 13.5 3.383V2.75C13.5 2.55109 13.579 2.36032 13.7197 2.21967C13.8603 2.07902 14.0511 2 14.25 2C14.8467 2 15.419 2.23705 15.841 2.65901C16.263 3.08097 16.5 3.65326 16.5 4.25C16.5 5.402 16.24 6.493 15.777 7.468C15.511 8.026 15.884 8.75 16.502 8.75H19.628C20.654 8.75 21.573 9.444 21.682 10.465C21.727 10.887 21.75 11.315 21.75 11.75C21.7541 14.4863 20.8191 17.1412 19.101 19.271C18.713 19.753 18.114 20 17.496 20H13.48C12.997 20 12.516 19.922 12.057 19.77L8.943 18.73C8.48411 18.5774 8.00361 18.4997 7.52 18.5H5.904Z M5.904 18.5C5.987 18.705 6.077 18.905 6.174 19.102C6.371 19.502 6.096 20 5.651 20H4.743C3.854 20 3.03 19.482 2.771 18.632C2.42465 17.4952 2.24906 16.3133 2.25 15.125C2.25 13.572 2.545 12.089 3.081 10.727C3.387 9.953 4.167 9.5 5 9.5H6.053C6.525 9.5 6.798 10.056 6.553 10.46C5.69889 11.866 5.24843 13.4799 5.251 15.125C5.251 16.319 5.483 17.458 5.905 18.5H5.904Z';
  const strokePath =
    'M6.633 10.25C7.439 10.25 8.166 9.804 8.664 9.17C9.44026 8.17962 10.4147 7.36218 11.525 6.77C12.248 6.386 12.875 5.814 13.178 5.055C13.3908 4.52325 13.5001 3.95575 13.5 3.383V2.75C13.5 2.55109 13.579 2.36032 13.7197 2.21967C13.8603 2.07902 14.0511 2 14.25 2C14.8467 2 15.419 2.23705 15.841 2.65901C16.263 3.08097 16.5 3.65326 16.5 4.25C16.5 5.402 16.24 6.493 15.777 7.468C15.511 8.026 15.884 8.75 16.502 8.75M16.502 8.75H19.628C20.654 8.75 21.573 9.444 21.682 10.465C21.727 10.887 21.75 11.315 21.75 11.75C21.7541 14.4863 20.8191 17.1412 19.101 19.271C18.713 19.753 18.114 20 17.496 20H13.48C12.997 20 12.516 19.922 12.057 19.77L8.943 18.73C8.48411 18.5774 8.00361 18.4997 7.52 18.5H5.904M16.502 8.75H14.25M5.904 18.5C5.987 18.705 6.077 18.905 6.174 19.102C6.371 19.502 6.096 20 5.651 20H4.743C3.854 20 3.03 19.482 2.771 18.632C2.42465 17.4952 2.24906 16.3133 2.25 15.125C2.25 13.572 2.545 12.089 3.081 10.727C3.387 9.953 4.167 9.5 5 9.5H6.053C6.525 9.5 6.798 10.056 6.553 10.46C5.69889 11.866 5.24843 13.4799 5.251 15.125C5.251 16.319 5.483 17.458 5.905 18.5H5.904Z';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      onClick={props.onClick}
      style={{ cursor: 'pointer' }}
    >
      <path d={fillPath} fill={props.fill} stroke="none" />
      <path
        d={strokePath}
        fill="none"
        stroke="#00000099"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const DisLike = ({ width = 24, height = 24, ...props }) => {
  const fillPath =
    'M5.998 12H2.872C1.846 12 0.927 11.306 0.818 10.285C0.772627 9.85817 0.749928 9.42924 0.75 9C0.75 6.152 1.742 3.536 3.399 1.479C3.787 0.997001 4.386 0.750001 5.004 0.750001H9.02C9.50361 0.749705 9.98411 0.827368 10.443 0.980001L13.557 2.02C14.0159 2.17263 14.4964 2.2503 14.98 2.25H16.274Z M5.998 12C6.616 12 6.989 12.724 6.723 13.282C6.24528 14.2874 5.99826 15.3869 6 16.5C6 17.0967 6.23705 17.669 6.65901 18.091C7.08097 18.5129 7.65326 18.75 8.25 18.75C8.44891 18.75 8.63968 18.671 8.78033 18.5303C8.92098 18.3897 9 18.1989 9 18V17.367C9 16.794 9.11 16.227 9.322 15.695C9.626 14.935 10.252 14.365 10.975 13.98C12.0849 13.3877 13.0591 12.5703 13.835 11.58C14.333 10.946 15.061 10.5 15.867 10.5H16.251Z M16.274 2.25C16.284 2.3 16.302 2.35 16.325 2.398C16.918 3.598 17.25 4.948 17.25 6.375C17.25 7.862 16.89 9.265 16.251 10.5Z M16.274 2.25C16.198 1.885 16.457 1.5 16.849 1.5H17.757C18.646 1.5 19.47 2.018 19.729 2.868C20.068 3.978 20.25 5.155 20.25 6.375C20.25 7.928 19.955 9.411 19.419 10.773C19.113 11.547 18.333 12 17.501 12H16.448C15.976 12 15.703 11.444 15.948 11.04C16.0552 10.8635 16.1563 10.6834 16.251 10.5 Z M5.998 12 L16.274 2.25 L16.251 10.5 Z';
  const strokePath =
    'M5.998 12H2.872C1.846 12 0.927 11.306 0.818 10.285C0.772627 9.85817 0.749928 9.42924 0.75 9C0.75 6.152 1.742 3.536 3.399 1.479C3.787 0.997001 4.386 0.750001 5.004 0.750001H9.02C9.50361 0.749705 9.98411 0.827368 10.443 0.980001L13.557 2.02C14.0159 2.17263 14.4964 2.2503 14.98 2.25H16.274M5.998 12C6.616 12 6.989 12.724 6.723 13.282C6.24528 14.2874 5.99826 15.3869 6 16.5C6 17.0967 6.23705 17.669 6.65901 18.091C7.08097 18.5129 7.65326 18.75 8.25 18.75C8.44891 18.75 8.63968 18.671 8.78033 18.5303C8.92098 18.3897 9 18.1989 9 18V17.367C9 16.794 9.11 16.227 9.322 15.695C9.626 14.935 10.252 14.365 10.975 13.98C12.0849 13.3877 13.0591 12.5703 13.835 11.58C14.333 10.946 15.061 10.5 15.867 10.5H16.251M5.998 12H8.2M16.274 2.25C16.284 2.3 16.302 2.35 16.325 2.398C16.918 3.598 17.25 4.948 17.25 6.375C17.25 7.862 16.89 9.265 16.251 10.5M16.274 2.25C16.198 1.885 16.457 1.5 16.849 1.5H17.757C18.646 1.5 19.47 2.018 19.729 2.868C20.068 3.978 20.25 5.155 20.25 6.375C20.25 7.928 19.955 9.411 19.419 10.773C19.113 11.547 18.333 12 17.501 12H16.448C15.976 12 15.703 11.444 15.948 11.04C16.0552 10.8635 16.1563 10.6834 16.251 10.5';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      onClick={props.onClick}
      style={{ cursor: 'pointer' }}
    >
      <path d={fillPath} fill={props.fill} stroke="none" />
      <path
        d={strokePath}
        fill="none"
        stroke="#00000099"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AssistantMessage;
