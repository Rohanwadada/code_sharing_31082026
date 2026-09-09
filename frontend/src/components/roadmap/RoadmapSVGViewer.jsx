'use client';

import {
  getEdgeSourcePoints,
  getEdgeTargetPoints,
  getInitialScalingValues,
} from '@/utils/roadmapRenderer';
import styles from './RoadmapSVGViewer.module.css';
import {
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Position,
} from '@xyflow/react';
import pendingIcon from '@/assets/learning-status-icons/pending.svg';
import completeIcon from '@/assets/learning-status-icons/complete.svg';
import inProgressIcon from '@/assets/learning-status-icons/in-progress.svg';
import { ALLOWED_NODE_TYPES } from '@/utils/constants';
import { isDarkColor } from '@/utils/helper';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import Image from 'next/image';

/**
 *
 * @param {Object} roadmap_graph - The roadmap graph object containing nodes and edges.
 * @param {Object} learningProgress - The learning progress object containing status for the node.
 * @param {Function} onNodeClick - The function to call when a node is clicked.
 * @description This component is used to render the roadmap graph as an SVG. It takes in the roadmap graph object and convert it to SVG learning progress object, and attach a function to handle node clicks.
 * @returns {JSX.Element}
 */
const RoadmapSVGViewer = ({
  source = 'roadmap-page',
  roadmap_graph,
  learningProgress,
  onNodeClick,
  courseRecommendations,
  showLearningStatus = true,
}) => {
  console.log('Roadmap graph: ', roadmap_graph);
  const targetWidth = 800;
  const targetHeight = 600;
  const padding = 0;

  const getHandlePosition = (handle) => {
    switch (handle?.[0]) {
      case 't':
        return Position.Top;
      case 'b':
        return Position.Bottom;
      case 'l':
        return Position.Left;
      case 'r':
        return Position.Right;
    }
  };

  const getEdgePath = (edge, sourcePosition, targetPosition) => {
    const sourceHandlePosition = getHandlePosition(edge?.sourceHandle);
    const targetHandlePosition = getHandlePosition(edge?.targetHandle);
    const edgeType = edge?.type;
    const edgeParameters = {
      sourceX: sourcePosition.x,
      sourceY: sourcePosition.y,
      sourcePosition: sourceHandlePosition,
      targetX: targetPosition.x,
      targetY: targetPosition.y,
      targetPosition: targetHandlePosition,
    };
    if (edgeType === 'straight') {
      const [path] = getStraightPath(edgeParameters);
      return path;
    } else if (edgeType === 'smoothstep') {
      const [path] = getSmoothStepPath(edgeParameters);
      return path;
    } else if (edgeType === 'step') {
      const [path] = getSmoothStepPath({
        ...edgeParameters,
        borderRadius: 0,
      });
      return path;
    } else if (
      edgeType === 'default' ||
      edgeType === 'bezier' ||
      edgeType === undefined
    ) {
      const [path] = getBezierPath(edgeParameters);
      return path;
    }
  };

  const { minX, minY, scale, graphWidth, graphHeight } =
    getInitialScalingValues(
      roadmap_graph?.nodes,
      targetWidth,
      targetHeight,
      padding,
    );

  const getCourseForChapter = (node) => {
    if (courseRecommendations.length === 0) return null;
    let courses = [];
    let flag = false;
    for (const course of courseRecommendations) {
      if (course.effective_chapters_covered.includes(node?.data?.label)) {
        flag = true;
        courses.push({
          courseName: course.course_name,
          courseUrl: course.course_url,
        });
      }
    }
    return flag ? courses : null;
  };

  const renderNodes = () => {
    return roadmap_graph.nodes.map((node) => {
      let pos = {
        x: node.position.x,
        y: node.position.y,
      };
      if (node.parentId) {
        const parentNode = roadmap_graph.nodes.find(
          (n) => n.id === node.parentId,
        );

        if (parentNode) {
          pos = {
            x: parentNode.position.x + node.position.x,
            y: parentNode.position.y + node.position.y,
          };
        }
      }

      const scaledWidth = node.measured.width;
      const scaledHeight =
        node.type === 'subtopicGroup'
          ? node.measured.height - 30
          : node.measured.height;
      const learningStatus = learningProgress[node.id] || {};
      const courses =
        source === 'roadmap-page' ? getCourseForChapter(node) : null;
      const nodeSVG = getNodeSvg(
        roadmap_graph,
        learningStatus,
        node,
        courses,
        showLearningStatus,
      );
      return (
        <g
          key={node.id}
          data-node-id={node.id}
          data-type={node.type}
          data-title={node.data.label}
          onClick={() => showLearningStatus && onNodeClick(node)}
          // className={styles['node-ct']}
          // transform={`translate(${pos.x}, ${pos.y})`}
        >
          {nodeSVG}
        </g>
      );
    });
  };

  const renderEdges = () => {
    return roadmap_graph.edges.map((edge) => {
      let sourceNode = roadmap_graph.nodes.find(
        (node) => node.id === edge.source,
      );

      if (sourceNode && sourceNode.parentId) {
        const parentNode = roadmap_graph.nodes.find(
          (n) => n.id === sourceNode.parentId,
        );

        if (parentNode) {
          sourceNode = {
            ...sourceNode,
            position: {
              ...sourceNode.position,
              x: parentNode.position.x + sourceNode.position.x,
              y: parentNode.position.y + sourceNode.position.y,
            },
          };
        }
      }

      let targetNode = roadmap_graph.nodes.find(
        (node) => node.id === edge.target,
      );
      if (targetNode && targetNode.parentId) {
        const parentNode = roadmap_graph.nodes.find(
          (n) => n.id === targetNode.parentId,
        );

        if (parentNode) {
          targetNode = {
            ...targetNode,
            position: {
              ...targetNode.position,
              x: parentNode.position.x + targetNode.position.x,
              y: parentNode.position.y + targetNode.position.y,
            },
          };
        }
      }

      if (sourceNode && targetNode) {
        const { sourceX, sourceY } = getEdgeSourcePoints(
          sourceNode,
          edge.sourceHandle,
        );
        const { targetX, targetY } = getEdgeTargetPoints(
          targetNode,
          edge.targetHandle,
        );
        const scaledSource = {
          x: sourceX,
          y: sourceY,
        };
        const scaledTarget = {
          x: targetX,
          y: targetY,
        };

        const edgePath = getEdgePath(edge, scaledSource, scaledTarget);
        const markerEnd = edge?.markerEnd ? `url(#${edge.markerEnd})` : null;

        // Return JSX for each edge
        return (
          <motion.path
            key={edge.id}
            d={edgePath}
            fill="none"
            stroke={edge?.style?.stroke || '#000000'} //#2b78e4
            strokeWidth={edge?.style?.strokeWidth || 2}
            strokeDasharray={edge?.style?.strokeDasharray || '0 0'}
            data-edge-id={edge.id}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={markerEnd}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              ease: 'easeInOut',
            }}
          />
        );
      }

      return null;
    });
  };

  return (
    <>
      <svg
        id="roadmap-svg"
        width={'100%'}
        // height={'100%'}
        viewBox={`${minX} ${minY - padding} ${graphWidth} ${graphHeight + padding * 2}`}
        xmlns="http://www.w3.org/2000/svg"
        className="roadmap-svg"
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: 'block',
          // minWidth: '100px',
          // maxWidth: '100vw',
          // minHeight: '300px',
          // maxHeight: "2000px"
        }}
      >
        <g className="nodes">{renderNodes()}</g>
        <g className="edges">{renderEdges()}</g>
      </svg>

      <Tooltip
        id="courses-tooltip"
        place="right"
        style={{
          backgroundColor: '#fff',
          // padding: "0",
          overflow: 'hidden',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: '10px',
        }}
        opacity={1}
        className={styles['course-tooltip']}
        render={({ activeAnchor }) => {
          const nodeId = activeAnchor?.getAttribute('data-node-id');
          const node = roadmap_graph.nodes.find((n) => n.id === nodeId);
          const courses =
            source === 'roadmap-page' ? getCourseForChapter(node) : null;
          return <CoursesByChapterViewer courses={courses} />;
        }}
        noArrow
        delayShow={100}
        clickable={true}
        fallbackPlacements={['top', 'left', 'bottom']}
        positionStrategy="fixed"
      />
    </>
  );
};

/**
 *
 * @param {Object} roadmap_graph - The roadmap graph object containing nodes and edges.
 * @param {Object} learningStatus - The learning progress object containing status for the node.
 * @param {Object} node - The node object containing information about the node.
 * @description This function is used to generate the node SVG. It takes in the roadmap graph object, learning progress object, and the node object and returns the SVG for the node.
 * @returns {SVGForeignObjectElement}
 */
const getNodeSvg = (
  roadmap_graph,
  learningStatus,
  node,
  courses,
  showLearningStatus,
) => {
  // console.log(courses);
  const animationVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.5,
        ease: 'easeInOut',
      },
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeInOut',
      },
    },
  };
  try {
    let pos = {
      x: node.position.x,
      y: node.position.y,
    };
    if (node.parentId) {
      const parentNode = roadmap_graph.nodes.find(
        (n) => n.id === node.parentId,
      );

      if (parentNode) {
        pos = {
          x: parentNode.position.x + node.position.x,
          y: parentNode.position.y + node.position.y,
        };
      }
    }

    const scaledWidth = node.measured.width;
    const scaledHeight =
      node.type === 'subtopicGroup'
        ? node.measured.height - 50
        : node.measured.height;

    if (ALLOWED_NODE_TYPES.common.includes(node?.type)) {
      const isSingleSubtopic = node?.type === 'subtopic' && !node?.parentId;
      return (
        <>
          <foreignObject
            x={pos.x}
            y={pos.y}
            height={scaledHeight}
            width={scaledWidth}
          >
            <motion.div
              style={{
                display: 'flex',
                justifyContent: 'space-evenly',
                gap: '10px',
                height: '100%',
                padding: isSingleSubtopic ? '12px' : '0px',
                borderRadius: isSingleSubtopic ? '9px' : 0,
                border: isSingleSubtopic
                  ? '2px solid rgba(102, 102, 102, 0.40)'
                  : 'none',
                alignItems: isSingleSubtopic ? 'center' : 'normal',
              }}
              variants={animationVariants}
              initial="hidden"
              animate="visible"
            >
              {showLearningStatus &&
                ['subtopic', 'assignmentNode'].includes(node?.type) && (
                  <div
                    style={{
                      width: '45px',
                      height: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    id="progress-status-div"
                  >
                    {getProgressStatusIcon(learningStatus?.status)}
                  </div>
                )}
              <div
                style={{
                  ...node?.data?.style,
                  // position: 'relative',
                  textAlign: 'center',
                  width: node?.parentId ? '90%' : '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  // lineHeight: '40px',
                  padding: '20px 12px',
                  fontFamily:
                    node?.type === 'learningAnchor'
                      ? 'cursive'
                      : 'var(--font-dm-sans)',
                  fontWeight: 600,
                  borderRadius: '9px',
                  border: `2.7px ${node?.type === 'learningAnchor' ? 'dashed' : 'solid'} ${node?.data?.style?.borderColor || '#BEBEBE'}`,
                  overflow: 'hidden',
                  flex: 1,
                  cursor: showLearningStatus ? 'pointer' : 'auto',
                }}
                id="node-lable-ct"
              >
                {node.type === 'assignmentNode' ? (
                  <div
                    style={{
                      ...node?.data?.style,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '10px',
                      fontFamily: 'inherit',
                      backgroundColor: 'transparent',
                    }}
                    id="maxi"
                  >
                    {/* <img src={assignmentIcon} style={{width: '40px'}} alt="" /> */}
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 25 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5.25 21.75C4.7 21.75 4.22933 21.5543 3.838 21.163C3.44667 20.7717 3.25067 20.3007 3.25 19.75V5.75C3.25 5.2 3.446 4.72933 3.838 4.338C4.23 3.94667 4.70067 3.75067 5.25 3.75H9.45C9.66667 3.15 10.0293 2.66667 10.538 2.3C11.0467 1.93333 11.6173 1.75 12.25 1.75C12.8827 1.75 13.4537 1.93333 13.963 2.3C14.4723 2.66667 14.8347 3.15 15.05 3.75H19.25C19.8 3.75 20.271 3.946 20.663 4.338C21.055 4.73 21.2507 5.20067 21.25 5.75V19.75C21.25 20.3 21.0543 20.771 20.663 21.163C20.2717 21.555 19.8007 21.7507 19.25 21.75H5.25ZM5.25 19.75H19.25V5.75H5.25V19.75ZM8.25 17.75H13.25C13.5333 17.75 13.771 17.654 13.963 17.462C14.155 17.27 14.2507 17.0327 14.25 16.75C14.2493 16.4673 14.1533 16.23 13.962 16.038C13.7707 15.846 13.5333 15.75 13.25 15.75H8.25C7.96667 15.75 7.72933 15.846 7.538 16.038C7.34667 16.23 7.25067 16.4673 7.25 16.75C7.24933 17.0327 7.34533 17.2703 7.538 17.463C7.73067 17.6557 7.968 17.7513 8.25 17.75ZM8.25 13.75H16.25C16.5333 13.75 16.771 13.654 16.963 13.462C17.155 13.27 17.2507 13.0327 17.25 12.75C17.2493 12.4673 17.1533 12.23 16.962 12.038C16.7707 11.846 16.5333 11.75 16.25 11.75H8.25C7.96667 11.75 7.72933 11.846 7.538 12.038C7.34667 12.23 7.25067 12.4673 7.25 12.75C7.24933 13.0327 7.34533 13.2703 7.538 13.463C7.73067 13.6557 7.968 13.7513 8.25 13.75ZM8.25 9.75H16.25C16.5333 9.75 16.771 9.654 16.963 9.462C17.155 9.27 17.2507 9.03267 17.25 8.75C17.2493 8.46733 17.1533 8.23 16.962 8.038C16.7707 7.846 16.5333 7.75 16.25 7.75H8.25C7.96667 7.75 7.72933 7.846 7.538 8.038C7.34667 8.23 7.25067 8.46733 7.25 8.75C7.24933 9.03267 7.34533 9.27033 7.538 9.463C7.73067 9.65567 7.968 9.75133 8.25 9.75ZM12.25 5C12.4667 5 12.646 4.929 12.788 4.787C12.93 4.645 13.0007 4.466 13 4.25C12.9993 4.034 12.9283 3.855 12.787 3.713C12.6457 3.571 12.4667 3.5 12.25 3.5C12.0333 3.5 11.8543 3.571 11.713 3.713C11.5717 3.855 11.5007 4.034 11.5 4.25C11.4993 4.466 11.5703 4.64533 11.713 4.788C11.8557 4.93067 12.0347 5.00133 12.25 5Z"
                        fill={
                          isDarkColor(node.data?.style?.backgroundColor)
                            ? '#ffffff'
                            : '#000000'
                        }
                      />
                    </svg>

                    <div style={{ fontFamily: 'inherit' }}>
                      {node.data.label}
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ width: '100%', fontFamily: 'inherit' }}>
                      {node.data.label}
                    </div>
                    {['subtopic'].includes(node.type) && courses && (
                      <Image
                        src={
                          'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2232%22%20height%3D%2232%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22%23000000%22%20fill-rule%3D%22evenodd%22%20d%3D%22M.573%204.1a.999.999%200%200%200%200%201.808l1.43.675v3.92c0%20.742.241%201.57.944%202.08c.886.64%202.5%201.42%205.06%201.42s4.17-.785%205.06-1.42c.703-.508.944-1.33.944-2.08v-3.92l1-.473v4.39a.5.5%200%200%200%201%200V5a1%201%200%200%200-.572-.904l-5.72-2.7a4%204%200%200%200-3.42%200l-5.72%202.7zm2.43%206.4V7.05l3.29%201.56a4%204%200%200%200%203.42%200l3.29-1.56v3.45c0%20.556-.18%201.01-.53%201.26c-.724.523-2.13%201.24-4.47%201.24s-3.75-.712-4.47-1.24c-.349-.252-.529-.709-.529-1.26zm3.72-8.2a2.99%202.99%200%200%201%202.56%200l5.72%202.7l-5.72%202.7a2.99%202.99%200%200%201-2.56%200L1.003%205z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E'
                        }
                        alt=""
                        style={{ width: '45px', height: '45px' }}
                        width={45}
                        height={45}
                        data-node-id={node.id}
                        data-tooltip-id="courses-tooltip"
                      />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </foreignObject>
          {/* {learningStatus?.status &&
            getProgressStatusIcon(learningStatus?.status, pos, scaledHeight)} */}
        </>
      );
    } else if (ALLOWED_NODE_TYPES.group.includes(node?.type)) {
      return (
        <foreignObject
          x={pos.x}
          y={pos.y}
          width={scaledWidth}
          height={scaledHeight}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '20px',
              border: `2.7px solid #BEBEBE`,
              backgroundColor: node?.data?.style?.backgroundColor || '#ffffff',
              overflow: 'hidden',
            }}
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                textAlign: 'center',
                width: '100%',
                height: `${node.data.headerStyle.height} px`,
                padding: '20px 12px',
                backgroundColor:
                  node?.data?.headerStyle?.backgroundColor || 'bisque',
                color: node?.data?.headerStyle?.color || '#000000',
                fontSize: node?.data?.headerStyle?.fontSize || '32px',
                // fontWeight: "bold",
                boxSizing: 'border-box',
                overflow: 'hidden',
                // wordBreak: 'break-all',
                // fontSize: "clamp(25px, 4vw, 20px)",
                wordWrap: 'break-word',
                fontFamily: 'var(--font-dm-sans)',
                fontWeight: 600,
                // marginTop: "2px"
              }}
            >
              {node.data.label}
            </div>
          </div>
        </foreignObject>
      );
    } else if (ALLOWED_NODE_TYPES.special.includes(node?.type)) {
      if (node?.type === 'paragraph') {
        return (
          <foreignObject
            x={pos.x}
            y={pos.y}
            width={scaledWidth}
            height={scaledHeight}
          >
            <div
              xmlns="http://www.w3.org/2000/xhtml"
              style={{
                ...node?.data?.style,
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                borderRadius: '9px',
                border: `2.7px solid ${node?.data?.style?.borderColor || 'black'}`,
                fontSize: `${parseInt(node?.data?.style?.fontSize, 10)}px`,
                cursor: showLearningStatus ? 'pointer' : 'auto',
              }}
            >
              <p
                style={{
                  margin: 0,
                  padding: 0,
                  WebkitTextSizeAdjust: '100%',
                  // lineHeight: '2rem',
                  position: 'relative',
                  wordBreak: 'break-all',
                }}
              >
                {node.data.label}
              </p>
            </div>
          </foreignObject>
        );
      }
    }
  } catch (error) {
    console.error(error);
  }
};

/**
 *
 * @param {String} status - The status of the learning progress.This can be 'pending', 'in-progress', or 'done'.
 * @description This function is used to get the progress status icon. It takes in the status of the learning progress and returns the corresponding icon.
 * @returns {HTMLImageElement}
 */
const getProgressStatusIcon = (status) => {
  let icon = pendingIcon;
  if (status === 'in-progress') {
    icon = inProgressIcon;
  } else if (status === 'done') {
    icon = completeIcon;
  }
  return (
    <Image
      width={`${100}%`}
      height={`${100}%`}
      style={{ width: '100%', height: '100%', flexShrink: '0' }}
      src={icon}
      alt=""
    />
  );
};

const CoursesByChapterViewer = ({ courses }) => {
  const getUrlDomain = (url) => {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  };

  return (
    <div className={styles['ccv-main-ct']}>
      {courses.map((c, idx) => (
        <a
          href={c.courseUrl}
          target="_blank"
          className={styles['course-ct']}
          key={idx}
        >
          <div className={styles['cn-links-img']}>
            <Image
              src={`https://www.google.com/s2/favicons?sz=128&domain=${getUrlDomain(c.courseUrl)}`}
              width={20}
              height={20}
              alt=""
            />
          </div>
          <p>{c.courseName}</p>
        </a>
      ))}
    </div>
  );
};

export default RoadmapSVGViewer;
