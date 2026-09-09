import React, { useContext } from 'react';
import {
  Handle,
  NodeResizeControl,
  Position,
  useReactFlow,
} from '@xyflow/react';
import styles from './TopicNode.module.css';
import plusIcon from '@/assets/plus-icon-topic.svg';
import { convertANode, createNewNode } from '@/utils/helper';
import NodeResizerCorners from './NodeResizerCorners';
import { USER_ROADMAP_HISTORY_ACTIONS } from '@/utils/constants';
import { RoadmapContext } from '@/context/RoadmapContext';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';

const controlStyle = {
  background: 'transparent',
  border: 'none',
};

const TopicNode = ({ id, data }) => {
  const userDetails = useAuthStore((s) => s.userDetails);
  const { pushToHistory } = useContext(RoadmapContext);
  const { getNode, getNodes, setNodes, getEdges } = useReactFlow();

  const emitCustomEvent = (eventName, eventData) => {
    const event = new CustomEvent(eventName, { detail: eventData });
    window.dispatchEvent(event);
  };

  const handleAddSubtopic = (event) => {
    event.stopPropagation();
    const parentNode = getNode(id);
    const newNodePosition = {
      x: parentNode.measured.width * 0.05,
      y: 80,
      // y: nodeHeaderRef.current.offsetHeight + 20 + (childNodes.length * 60)
    };
    const newSubtopicNode = createNewNode(
      'subtopic',
      userDetails?.email,
      newNodePosition,
      false,
      true,
      undefined,
      {
        parentId: id,
        extent: 'parent',
        connectable: true,
        draggable: true,
        style: { width: parentNode.measured.width * 0.9 },
      },
    );
    setNodes((prevNodes) => {
      const updatedNodes = prevNodes.map((node) => {
        if (
          node.id === id &&
          (node?.data?.prevType === 'topicGroup' ||
            node?.data?.prevType === undefined)
        ) {
          // return {...node, type: 'subtopicGroup', data: {...node.data, prevType: 'subtopic'}}
          return convertANode(
            node,
            'topicGroup',
            userDetails?.email,
            node.position,
            false,
            true,
            !node?.data?.prevType ? { width: '300px' } : {},
          );
        }
        return node;
      });

      // newNodes = updatedNodes;

      const finalNodes = [...updatedNodes, newSubtopicNode];
      const finalEdges = getEdges();
      pushToHistory(
        finalNodes,
        finalEdges,
        USER_ROADMAP_HISTORY_ACTIONS.ADD_NODE.name,
        {
          message: 'Added a new subtopic to the topic',
          node_id: [newSubtopicNode?.id],
        },
      );
      return finalNodes;
    });
  };

  return (
    <>
      <div className={styles['title-node-container']}>
        <div className={styles['label']} style={data?.style}>
          {data?.label}
        </div>
        {(data?.prevType === 'topicGroup' || data?.convertible) && (
          <button
            className={styles['add-topic-btn']}
            onClick={handleAddSubtopic}
            title="Add Subtopic"
          >
            <Image className={styles['add-topic-img']} src={plusIcon} alt="" />
          </button>
        )}

        <Handle
          type="target"
          position={Position.Top}
          isConnectable={true}
          id="t2"
          // style={{ display: data?.showTargets ? "block" : "none" }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="l2"
          isConnectable={true}
          // style={{ display: data?.showTargets ? "block" : "none" }}
        />
        <Handle
          type="target"
          position={Position.Right}
          id="r2"
          isConnectable={true}
          // style={{ display: data?.showTargets ? "block" : "none" }}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="b2"
          isConnectable={true}
          // style={{ display: data?.showTargets ? "block" : "none" }}
        />

        <Handle
          type="source"
          position={Position.Top}
          isConnectable={true}
          id="t1"
        />
        <Handle
          type="source"
          position={Position.Left}
          id="l1"
          isConnectable={true}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="r1"
          isConnectable={true}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="b1"
          isConnectable={true}
        />

        <NodeResizerCorners id={id} />
      </div>
    </>
  );
};

export default TopicNode;
