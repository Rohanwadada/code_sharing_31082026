import { useContext, useEffect, useState } from 'react';
import styles from './ContentUpdateMailerModal.module.css';
import { RoadmapContext } from '@/context/RoadmapContext';
import { useReactFlow } from '@xyflow/react';
import { useNotification } from '@/hooks/useNotification';
import { v4 as uuid4 } from 'uuid';
import closeIcon from '@/assets/close.svg';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import { notifyContenUpdate } from '@/service/roadmapContent.service';

// Animation variants
const animationVariants = {
  backdrop: {
    hidden: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
  },
  modal: {
    hidden: {
      // y: 20,
      scale: 0.95,
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
    visible: {
      // y: 0,
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
  },
};

const ContentUpdateMailerModal = ({ roadmapId, onCancel }) => {
  const userDetails = useAuthStore((s) => s.userDetails);
  const { contentUpdatedNodeDetails, setContentUpdateNodeDetails } =
    useContext(RoadmapContext);
  const { getNode } = useReactFlow();
  const { showLoadingNotification, resolveNotification, rejectNotification } =
    useNotification();
  const [nodedata, setNodeData] = useState([]);
  const [emailSubject, setEmailSubject] = useState('Roadmap Content Update');
  const [semdingEmail, setSendingEmail] = useState(false);

  const handleEmailSubjectChange = (e) => {
    setEmailSubject(e.target.value);
  };

  const handleSendClick = async () => {
    const toastId = uuid4();
    showLoadingNotification(toastId, 'Sending email update. Please wait');
    setSendingEmail(true);
    try {
      const responseData = await notifyContenUpdate(
        roadmapId,
        emailSubject.trim(),
        nodedata,
      );

      resolveNotification(toastId, 'Email sent successfully');
      onCancel();
      setContentUpdateNodeDetails([]);
      localStorage.removeItem(`pushEmailContentData_${roadmapId}`);
    } catch (error) {
      console.log(error);
      rejectNotification(toastId, 'Something went wrong. Please try again');
    }
    setSendingEmail(false);
  };

  useEffect(() => {
    const extractDetails = () => {
      const grouped = {}; // For nodes with parent
      const result = []; // Final result array

      contentUpdatedNodeDetails.forEach((nodeEntry) => {
        const nodeId = nodeEntry.nodeId;
        const node = getNode(nodeId);
        if (!node) return;

        const parentId = node?.parentId;
        const childTitle = node?.data?.label;
        const childContent = nodeEntry.content;

        if (parentId) {
          const parent = getNode(parentId);
          const parentTitle = parent?.data?.label || '-';

          if (!grouped[parentId]) {
            grouped[parentId] = {
              parentTitle,
              childDetails: [],
            };
          }

          grouped[parentId].childDetails.push({
            id: nodeId,
            title: childTitle,
            content: childContent,
          });
        } else {
          // No parent – push as separate entry
          result.push({
            parentTitle: '-',
            childDetails: [
              { id: nodeId, title: childTitle, content: childContent },
            ],
          });
        }
      });

      // Combine grouped entries with individual parentless entries
      const groupedArray = Object.values(grouped);
      const finalResult = [...groupedArray, ...result];

      console.log(finalResult);
      setNodeData(finalResult);
    };

    extractDetails();
  }, [contentUpdatedNodeDetails]);

  return (
    <motion.div
      className={styles['backdrop']}
      onClick={onCancel}
      variants={animationVariants.backdrop}
      initial="hidden"
      animate="visible"
      exit="hidden"
      key="backdrop"
    >
      <motion.div
        className={styles['modal']}
        onClick={(e) => e.stopPropagation()}
        variants={animationVariants.modal}
        initial="hidden"
        animate="visible"
        exit="hidden"
        key="modal"
      >
        <div className={styles['title']}>Push Email Update</div>
        {contentUpdatedNodeDetails.length >= 1 ? (
          <>
            <div className={styles['email-ct']}>
              <div className={styles['subject-ct']}>
                <p className={styles['subject-text']}>Email Subject</p>
                <input
                  type="text"
                  className={styles['subject-input']}
                  value={emailSubject}
                  onChange={handleEmailSubjectChange}
                />
              </div>
              {
                <div className={styles['content-ct']}>
                  <p className={styles['content-head']}>Updated Contents</p>
                  <div>
                    <table className={styles['content-table']}>
                      <thead>
                        <tr>
                          <th>Module / Topic Title</th>
                          <th>Materials</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nodedata.map((group, index) => (
                          <tr key={index}>
                            <td>{group?.parentTitle || '-'}</td>

                            <td className={styles['materials-col']}>
                              <table className={styles['inner-table']}>
                                {index === 0 && (
                                  <thead>
                                    <tr>
                                      <th>Chapter Name</th>
                                      <th>Content Name</th>
                                    </tr>
                                  </thead>
                                )}
                                <tbody>
                                  {group.childDetails?.map((child, cIndex) => (
                                    <tr key={cIndex}>
                                      <td>{child.title}</td>
                                      <td>
                                        {/* {child.content.sort((a, b) => a.id - b.id).map(cc => cc.title).join(', ')} */}
                                        <ol style={{ paddingLeft: '15px' }}>
                                          {child.content
                                            .sort((a, b) => a.id - b.id)
                                            .map((cc, idx) => (
                                              <li
                                                key={idx}
                                                style={{ marginBottom: '5px' }}
                                              >
                                                {cc.title}
                                              </li>
                                            ))}
                                        </ol>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              }
              <button
                className={styles['send-btn']}
                onClick={handleSendClick}
                disabled={semdingEmail}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <>
            <div>Please add a node to notification queue to send update</div>
            <div>{`Click on a Node > Click on "Content & Links" > Click on the "Add Icon" on top-right`}</div>
          </>
        )}
        <button className={styles['close-btn']} onClick={onCancel}>
          <Image src={closeIcon} alt="close" />
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ContentUpdateMailerModal;
