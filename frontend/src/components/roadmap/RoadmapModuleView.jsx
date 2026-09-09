import { useEffect, useMemo } from 'react';
import styles from './RoadmapModuleView.module.css';
import NodeContentMarkdownRenderer from './NodeContentMarkdownRenderer';
import videoIcon from '@/assets/node-content-viewer/video.svg';
import articleIcon from '@/assets/node-content-viewer/article.svg';
import websiteIcon from '@/assets/node-content-viewer/website.svg';
import liveIcon from '@/assets/node-content-viewer/live.svg';
import documentIcon from '@/assets/node-content-viewer/document.svg';
import databaseIcon from '@/assets/node-content-viewer/database.svg';
import folderIcon from '@/assets/node-content-viewer/folder.svg';
import assignmentIcon from '@/assets/assignment-Icon.svg';
import downloadIcon from '@/assets/node-content-viewer/download.svg';
import { motion, AnimatePresence } from 'framer-motion';
import dropdownIcon from '@/assets/select-element-dropdown-icon.svg';
import { ProgressStatusDropDown } from './NodeContentViewer';
import Skeleton from '@/components/utility/Skeleton';
import closeIcon from '@/assets/close.svg';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getNodeContent as getNodeContentApi } from '@/service/roadmapContent.service';

const MotionImage = motion.create(Image);

const dropdownAnimationVarient = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1 },
  transition: { duration: 0.3, ease: 'easeInOut' },
};

const arrowVariants = {
  open: { rotate: 180 },
  closed: { rotate: 0 },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 0 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

const RoadmapModuleView = ({
  roadmapId,
  nodes,
  edges,
  learningProgress,
  setLearningProgress,
  nodeData,
  setNodeData,
}) => {
  const userDetails = useAuthStore((s) => s.userDetails);
  const searchParams = useSearchParams();
  const router = useRouter();
  const location = usePathname();

  const sortByPosition = (nodeA, nodeB) => nodeA.position.x - nodeB.position.x;

  const relativeModuleOrder = useMemo(() => {
    if (!nodes.length) return null;

    const titleNode = nodes.find((n) => n.type === 'title');
    if (!titleNode) return null;

    const topicNodes = nodes.filter((n) =>
      ['topic', 'topicGroup'].includes(n.type),
    );

    // Build the hierarchy
    const structure = {
      title: titleNode.data.label,
      topics: topicNodes
        .sort((a, b) => a.position.y - b.position.y) // vertical order
        .map((topic) => {
          const nodesConnectedToTopic = edges
            .filter((e) => e.source === topic.id)
            .map((e) => e.target);
          const modules = nodesConnectedToTopic
            .map((id) =>
              nodes.find(
                (n) =>
                  n.id === id && ['subtopicGroup', 'subtopic'].includes(n.type),
              ),
            )
            .filter(Boolean)
            .sort(sortByPosition); // left-to-right order

          return {
            topic: { id: topic.id, name: topic.data.label },
            modules: modules.map((module) => {
              const subtopics = nodes
                .filter((n) => n?.parentId === module.id)
                .filter(Boolean)
                .sort(sortByPosition);

              return {
                module: {
                  id: module.id,
                  name: module.data.label,
                  parentId: topic.id,
                },
                subtopics: subtopics.map((st) => ({
                  id: st.id,
                  name: st.data.label,
                  parentId: module.id,
                })),
              };
            }),
          };
        }),
    };

    return structure;
  }, [nodes, edges]);

  const parentMap = useMemo(() => {
    if (!relativeModuleOrder) return {};

    const map = {};

    relativeModuleOrder.topics.forEach((topic) => {
      map[topic.topic.id] = null; // topic has no parent

      topic.modules.forEach((module) => {
        map[module.module.id] = topic.topic.id;

        module.subtopics.forEach((sub) => {
          map[sub.id] = module.module.id;
        });
      });
    });

    return map;
  }, [relativeModuleOrder]);

  const getNodeContent = async (roadmapId, nodeId) => {
    try {
      setNodeData((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          contentFetching: true,
        },
      }));
      const responseData = await getNodeContentApi(roadmapId, nodeId);
      return {
        title: responseData?.content?.title || '',
        description: responseData?.content?.description || '',
        links: responseData?.content?.links || [],
      };
    } catch (error) {
      return {};
    } finally {
      setNodeData((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          contentFetching: false,
        },
      }));
    }
  };

  const handleDropDownClick = async (event, node, isChapter = false) => {
    event.stopPropagation();
    const nodeId = node.id;
    if (!nodeData[nodeId]?.isOpen) {
      const baseURL = location;
      const newParams = new URLSearchParams(searchParams);
      newParams.set('node', nodeId);
      // router(`${baseURL}?${newParams.toString()}`, { replace: true });
    } else {
      const baseURL = location;
      const newParams = new URLSearchParams(searchParams);
      const parentNodeId = node?.parentId || null;
      if (parentNodeId) {
        newParams.set('node', parentNodeId);
      } else {
        newParams.delete('node');
      }
      const finalURL = newParams.toString()
        ? `${baseURL}?${newParams.toString()}`
        : baseURL;
      // router(finalURL, { replace: true });
    }
    setNodeData((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        isOpen: !prev[nodeId]?.isOpen,
      },
    }));

    if (isChapter && !nodeData[nodeId]?.isOpen) {
      const content = nodeData[nodeId]?.content
        ? nodeData[nodeId]?.content
        : await getNodeContent(roadmapId, nodeId);
      if (nodeData[nodeId]?.content) {
        setTimeout(() => {
          scrollToNode(node.id);
        }, 100);
      } else {
        scrollToNode(node.id);
      }
      setNodeData((prev) => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          content: content,
        },
      }));
    }
  };

  /**
   *
   * @param {String} content_type - It is the type of content, e.g. video, website, course
   * @returns icon according to the content type
   * @example
   * <img src={getContentImageIcon('video')} alt="" />
   */
  const getContentImageIcon = (content_type) => {
    switch (content_type.toLowerCase()) {
      case 'video':
        return videoIcon;
      case 'article':
        return documentIcon;
      case 'course':
        return liveIcon;
      case 'website':
        return websiteIcon;
      case 'opensource':
        return websiteIcon;
      case 'document':
        return documentIcon;
      case 'data_table':
        return databaseIcon;
      case 'folder':
        return folderIcon;
      case 'assignment':
        return assignmentIcon;
      case 'notebook':
        return articleIcon;
    }
  };

  const scrollToNode = (nodeId) => {
    const el = document.querySelector(`[data-list-node-id="${nodeId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus?.();
    }
  };

  useEffect(() => {
    const nodeId = searchParams.get('node');
    const currentTab = searchParams.get('tab');
    if (!nodeId || currentTab !== 'list') return;

    const openNodeAndParents = async () => {
      // Expand node + its parent graph
      setNodeData((prev) => {
        const newState = { ...prev };
        let current = nodeId;

        while (current !== undefined) {
          newState[current] = {
            ...newState[current],
            isOpen: true,
          };

          // parentMap[current] can be null, not undefined → stop when undefined
          current = parentMap[current];
        }

        return newState;
      });

      // Load content if subtopic
      const node = nodes.find((n) => n.id === nodeId);

      if (node) {
        if (['subtopic', 'assignmentNode'].includes(node.type)) {
          const content = await getNodeContent(roadmapId, nodeId);

          setNodeData((prev) => ({
            ...prev,
            [nodeId]: {
              ...prev[nodeId],
              content,
            },
          }));
          scrollToNode(nodeId);
        } else {
          setTimeout(() => {
            scrollToNode(nodeId);
          }, 50);
        }
      }
    };

    openNodeAndParents();
  }, [parentMap]);

  return (
    <div className={styles['main-container']}>
      {relativeModuleOrder && (
        <>
          <div className={styles['title-node']}>
            {relativeModuleOrder.title}
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={styles['topic-ct']}
          >
            {relativeModuleOrder.topics.map((topic, idx) => (
              <motion.div
                key={idx}
                className={styles['topic-node']}
                variants={cardVariants}
                data-list-node-id={topic.topic.id}
              >
                <div
                  className={styles['topic-head']}
                  onClick={(e) => handleDropDownClick(e, topic.topic)}
                >
                  <div>{topic.topic.name}</div>
                  <MotionImage
                    src={dropdownIcon}
                    alt="dropdown-icon"
                    animate={
                      nodeData[topic.topic.id]?.isOpen ? 'open' : 'closed'
                    }
                    variants={arrowVariants}
                    transition={{ duration: 0.2 }}
                    className={styles['dropdown-img']}
                  />
                </div>
                <AnimatePresence>
                  {nodeData[topic.topic.id]?.isOpen && (
                    <motion.div
                      className={styles['module-ct']}
                      variants={dropdownAnimationVarient}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      transition="transition"
                    >
                      {topic.modules.map((module, index) => (
                        <div
                          className={styles['module-node']}
                          key={index}
                          data-list-node-id={module.module.id}
                        >
                          <div
                            className={styles['module-head']}
                            onClick={(e) =>
                              handleDropDownClick(e, module.module)
                            }
                          >
                            <div>{module.module.name}</div>
                            <MotionImage
                              src={dropdownIcon}
                              alt="dropdown-icon"
                              animate={
                                nodeData[module.module.id]?.isOpen
                                  ? 'open'
                                  : 'closed'
                              }
                              variants={arrowVariants}
                              transition={{ duration: 0.2 }}
                              className={styles['dropdown-img']}
                            />
                          </div>
                          <AnimatePresence>
                            {nodeData[module.module.id]?.isOpen && (
                              <motion.div
                                className={styles['chapter-node-ct']}
                                variants={dropdownAnimationVarient}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                transition="transition"
                              >
                                {module.subtopics.map((subtopic, idx) => (
                                  <div
                                    key={idx}
                                    className={styles['chapter-node']}
                                    data-list-node-id={subtopic.id}
                                  >
                                    <div
                                      className={styles['chapter-head']}
                                      onClick={(e) =>
                                        handleDropDownClick(e, subtopic, true)
                                      }
                                    >
                                      <div>{subtopic.name}</div>
                                      <div
                                        className={styles['chapter-head-right']}
                                      >
                                        <ProgressStatusDropDown
                                          selectedNode={subtopic}
                                          learningProgress={learningProgress}
                                          setLearningProgress={
                                            setLearningProgress
                                          }
                                          userDetails={userDetails}
                                          roadmapId={roadmapId}
                                        />
                                        <MotionImage
                                          src={dropdownIcon}
                                          alt="dropdown-icon"
                                          animate={
                                            nodeData[subtopic.id]?.isOpen
                                              ? 'open'
                                              : 'closed'
                                          }
                                          variants={arrowVariants}
                                          transition={{ duration: 0.2 }}
                                          className={styles['dropdown-img']}
                                        />
                                      </div>
                                    </div>
                                    <AnimatePresence>
                                      {nodeData[subtopic.id]?.isOpen && (
                                        <motion.div
                                          className={styles['chapter-content']}
                                          variants={dropdownAnimationVarient}
                                          initial="hidden"
                                          animate="visible"
                                          exit="hidden"
                                          transition="transition"
                                        >
                                          {nodeData[subtopic.id]
                                            ?.contentFetching ? (
                                            <NodeContentSkeletonLoader />
                                          ) : (
                                            <>
                                              <button
                                                className={
                                                  styles['close-button']
                                                }
                                                onClick={(e) =>
                                                  handleDropDownClick(
                                                    e,
                                                    subtopic,
                                                    true,
                                                  )
                                                }
                                              >
                                                <Image src={closeIcon} alt="" />
                                              </button>
                                              <div
                                                className={
                                                  styles['node-content-ct']
                                                }
                                              >
                                                <hr />
                                                <NodeContentMarkdownRenderer
                                                  content={
                                                    nodeData[subtopic.id]
                                                      ?.content?.description ||
                                                    'No content Found '
                                                  }
                                                />
                                                {(
                                                  nodeData[subtopic.id]?.content
                                                    ?.links || []
                                                ).length !== 0 && (
                                                  <div
                                                    className={
                                                      styles['open-access']
                                                    }
                                                  >
                                                    <div
                                                      className={
                                                        styles[
                                                          'open-access-heading'
                                                        ]
                                                      }
                                                    >
                                                      <p
                                                        className={
                                                          styles[
                                                            'open-access-p'
                                                          ]
                                                        }
                                                      >
                                                        Open Access
                                                      </p>
                                                      <div
                                                        className={
                                                          styles[
                                                            'open-access-hr'
                                                          ]
                                                        }
                                                      ></div>
                                                    </div>

                                                    <div
                                                      className={
                                                        styles[
                                                          'open-access-contents'
                                                        ]
                                                      }
                                                    >
                                                      {nodeData[subtopic.id]
                                                        ?.content?.links &&
                                                        (nodeData[
                                                          subtopic.id
                                                        ]?.content?.links.filter(
                                                          (link) =>
                                                            link.accessType ===
                                                            'public',
                                                        ).length === 0 ? (
                                                          <div
                                                            className={
                                                              styles[
                                                                'node-description'
                                                              ]
                                                            }
                                                          >
                                                            {' '}
                                                            <p>
                                                              No content
                                                              available
                                                            </p>{' '}
                                                          </div>
                                                        ) : (
                                                          nodeData[
                                                            subtopic.id
                                                          ]?.content?.links
                                                            .filter(
                                                              (link) =>
                                                                link.accessType ===
                                                                'public',
                                                            )
                                                            .map(
                                                              (link, index) =>
                                                                link?.accessType ===
                                                                  'public' && (
                                                                  <div
                                                                    className={
                                                                      styles[
                                                                        'contents-ct'
                                                                      ]
                                                                    }
                                                                    key={index}
                                                                  >
                                                                    <div
                                                                      className={
                                                                        styles[
                                                                          'contents'
                                                                        ]
                                                                      }
                                                                    >
                                                                      <Image
                                                                        src={getContentImageIcon(
                                                                          link?.type,
                                                                        )}
                                                                        alt=""
                                                                      />
                                                                      <a
                                                                        href={
                                                                          link?.url
                                                                        }
                                                                        target="_blank"
                                                                      >
                                                                        {link?.title ||
                                                                          'No title Provided'}{' '}
                                                                      </a>
                                                                    </div>
                                                                    {link?.downloadable && (
                                                                      <Image
                                                                        src={
                                                                          downloadIcon
                                                                        }
                                                                        alt="downloadable"
                                                                        title="downloadable"
                                                                      />
                                                                    )}
                                                                  </div>
                                                                ),
                                                            )
                                                        ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </>
                                          )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
};

const NodeContentSkeletonLoader = () => {
  return (
    <div className={styles['sk-main']}>
      <Skeleton height={100} width={'100%'} count={5} gap={1} />
      <Skeleton height={10} width={'100%'} count={5} gap={1} />
    </div>
  );
};

export default RoadmapModuleView;
