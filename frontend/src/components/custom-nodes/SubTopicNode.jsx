import React, { useContext } from 'react';
import styles from './SubTopicNode.module.css';
import {
  Handle,
  NodeResizeControl,
  Position,
  useReactFlow,
} from '@xyflow/react';
import plusIcon from '@/assets/plus-icon.svg';
import { convertANode, createNewNode } from '../../utils/helper';
import NodeResizerCorners from './NodeResizerCorners';
import { useAuthStore } from '@/store/authStore';

const SubTopicNode = ({ id, data, parentId }) => {
  const userDetails = useAuthStore((s) => s.userDetails);
  const { getNode, getNodes, setNodes } = useReactFlow();

  const emitCustomEvent = (eventName, eventData) => {
    const event = new CustomEvent(eventName, { detail: eventData });
    window.dispatchEvent(event);
  };
  const handleAddSubtopic = () => {
    const parentNode = getNode(id);

    const childNodes = getNodes().filter(
      (node) => node?.parentId === parentNode.id,
    );
    const newNodePosition = {
      x: parentNode.measured.width * 0.05,
      y: 80,
      // y: nodeHeaderRef.current.offsetHeight + 20 + (childNodes.length * 60)
    };
    const newSubtopicNode = createNewNode(
      'subtopic',
      userDetails?.email,
      newNodePosition,
      true,
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
          (node?.data?.prevType === 'subtopicGroup' ||
            node?.data?.prevType === undefined)
        ) {
          // return {...node, type: 'subtopicGroup', data: {...node.data, prevType: 'subtopic'}}
          return convertANode(
            node,
            'subtopicGroup',
            userDetails?.email,
            node.position,
            false,
            true,
            {},
          );
        }
        return node;
      });

      return [...updatedNodes, newSubtopicNode];
    });
    if (!parentNode) return;
    // setTimeout(() => {
    //   emitCustomEvent("groupNode::addSubtopic", {nodeId: id});
    // }, 10);
    //   const newNodePosition = {
    //     x: parentNode.measured.width*0.05,
    //     y: 80
    //     // y: nodeHeaderRef.current.offsetHeight + 20 + (childNodes.length * 60)
    // };
    // setNodes((prevNodes) => {
    //   let updatedNodes = prevNodes.map((node) => {
    //     if(node.id === id && (node?.data?.prevType === 'subtopicGroup' || node?.data?.prevType === undefined)) {
    //       return {...node, type: 'subtopicGroup', data: {...node.data, prevType: 'subtopic'}}
    //     }
    //     return node;
    //   });
    //   // updatedNodes = rearrangeChildNodesLayout([...updatedNodes, newSubtopicNode], parentNode, nodeHeaderRef.current.offsetHeight);
    //   return [...updatedNodes, newSubtopicNode];
    // });
  };
  return (
    <>
      <div className={styles['title-node-container']}>
        <div className={styles['label']} style={data?.style}>
          {data?.label}
        </div>
        {/* {(data?.prevType === 'subtopicGroup' || data?.convertible) && (
          <button
            className={styles['add-subtopic-btn']}
            onClick={handleAddSubtopic}
          >
            <Image
              className={styles['add-subtopic-img']}
              src={plusIcon}
              alt=""
            />
          </button>
        )} */}
        {!parentId && (
          <>
            <Handle
              type="target"
              position={Position.Top}
              isConnectable={true}
              id="t2"
            />
            <Handle
              type="target"
              position={Position.Left}
              id="l2"
              isConnectable={true}
            />
            <Handle
              type="target"
              position={Position.Right}
              id="r2"
              isConnectable={true}
            />
            <Handle
              type="target"
              position={Position.Bottom}
              id="b2"
              isConnectable={true}
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
          </>
        )}

        <NodeResizerCorners id={id} />
      </div>
    </>
  );
};

export default SubTopicNode;
