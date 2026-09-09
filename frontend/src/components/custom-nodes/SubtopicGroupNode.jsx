import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Handle,
  NodeResizeControl,
  Position,
  useReactFlow,
  NodeResizer,
} from '@xyflow/react';
import styles from './SubtopicGroupNode.module.css';
import SubTopicNode from './SubTopicNode';
import { convertANode, createNewNode, nodeHeaderHeights } from '@/utils/helper';
import plusIcon from '@/assets/plus-icon.svg';
import { RoadmapContext } from '@/context/RoadmapContext';
import { USER_ROADMAP_HISTORY_ACTIONS } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';

const SubtopicGroupNode = ({ id, data, selected, measured }) => {
  const nodeHeaderRef = useRef(null);
  const [headingHeight, setHeadingHeight] = useState(
    nodeHeaderRef.current ? nodeHeaderRef.current.offsetHeight : 70,
  );
  const userDetails = useAuthStore((s) => s.userDetails);
  const { getNode, setNodes, getNodes, getEdges } = useReactFlow();

  const { pushToHistory } = useContext(RoadmapContext);

  const rearrangeChildNodesLayout = (
    nodes,
    parentNode,
    headingHeight = 70,
    type = undefined,
  ) => {
    if (!nodes) return;

    // Get all child nodes and sort them by y-position
    let parentChildren = nodes.filter(
      (node) => node.parentId === parentNode.id,
    );

    if (!type && type !== 'new-subtopic-add') {
      parentChildren = parentChildren.sort(
        (a, b) => a.position.y - b.position.y,
      );
    }
    if (parentChildren.length === 0) {
      return nodes.map((node) => {
        if (
          node.id === parentNode.id &&
          (node?.data?.prevType === 'subtopic' ||
            node?.data?.prevType === undefined)
        ) {
          // return {...node, type: 'subtopic', data: {...node.data, prevType: 'subtopicGroup',}}
          return convertANode(
            node,
            'subtopic',
            userDetails?.email,
            node.position,
            false,
            true,
            {},
          );
        }
        return node;
      });
    }
    let currentY = headingHeight + 30; // Position below heading
    let totalHeight = currentY;

    // Update child node positions
    const updatedChildren = parentChildren.map((node) => {
      const updatedNode = {
        ...node,
        position: { ...node.position, y: currentY },
      };
      currentY += (node.measured?.height || 50) + 25; // Move down by node height + gap
      totalHeight = currentY; // Track total occupied height
      return updatedNode;
    });

    // Ensure parent height is sufficient
    const minRequiredHeight = totalHeight + 80; // Extra padding
    // const newParentHeight = Math.max(parentNode.measured?.height || 100, minRequiredHeight);
    let newParentHeight = Math.max(headingHeight + 50, minRequiredHeight);
    // if(parentChildren.length === 0) {
    //   newParentHeight = nodeHeaderRef.current.offsetHeight;
    // }
    // Update parent node height if necessary

    return nodes.map((node) => {
      if (node.id === parentNode.id) {
        return {
          ...node,
          measured: { ...node.measured, height: newParentHeight },
          style: { ...node.style, height: newParentHeight },
          height: newParentHeight,
          data: {
            ...node.data,
            headerStyle: {
              ...node.data.headerStyle,
              height: headingHeight,
            },
          },
          // type: parentChildren.length === 0 ? 'subtopic': 'subtopicGroup'
        };
      }
      return updatedChildren.find((updated) => updated.id === node.id) || node;
    });
  };

  const handleAddSubtopic = (event) => {
    event.stopPropagation();
    const parentNode = getNode(id);

    const childNodes = getNodes().filter(
      (node) => node?.parentId === parentNode.id,
    );
    if (!parentNode) return;
    const newNodePosition = {
      x: parentNode.measured.width * 0.05,
      // y: 70 + (childNodes.length * 60)
      y: nodeHeaderRef.current.offsetHeight + 20 + childNodes.length * 60,
    };
    const newSubtopicNode = createNewNode(
      'subtopic',
      userDetails?.email,
      newNodePosition,
      false,
      true,
      false,
      {
        parentId: id,
        extent: 'parent',
        connectable: true,
        draggable: true,
        style: { width: parentNode.measured.width * 0.9 },
      },
    );
    setNodes((prevNodes) => {
      let updatedNodes = prevNodes;
      updatedNodes = rearrangeChildNodesLayout(
        [...updatedNodes, newSubtopicNode],
        parentNode,
        nodeHeaderRef.current.offsetHeight,
        'new-subtopic-add',
      );
      const finalEdges = getEdges();
      pushToHistory(
        updatedNodes,
        finalEdges,
        USER_ROADMAP_HISTORY_ACTIONS.ADD_NODE.name,
        {
          message: 'Added a new subtopic to the module',
          node_id: [newSubtopicNode?.id],
        },
      );
      return updatedNodes;
    });
  };

  const handleResizeEnd = (event, { width, height }) => {
    const updatedNodes = getNodes().map((node) =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              width,
              height,
            },
            style: {
              ...node.style,
              width,
              height,
            },
          }
        : node,
    );
    pushToHistory(
      updatedNodes,
      getEdges(),
      USER_ROADMAP_HISTORY_ACTIONS.UPDATE_NODE.name,
      {
        message: 'Changed the dimension of node(resize)',
        type: 'resize',
        source: 'canvas',
        node_id: [id],
        to: { height: height, width: width },
      },
    );
  };

  useEffect(() => {
    if (
      nodeHeaderRef.current &&
      nodeHeaderRef.current.offsetHeight !== headingHeight
    ) {
      const newHeight = nodeHeaderRef.current.offsetHeight;
      setHeadingHeight(newHeight);

      const nodes = getNodes();
      const parentNode = getNode(id);

      const updatedNodes = rearrangeChildNodesLayout(
        nodes,
        parentNode,
        newHeight,
      );

      nodeHeaderHeights.set(id, newHeight);

      setNodes(updatedNodes);
    }
  }, [data?.label, data?.headerStyle?.fontSize]);

  useEffect(() => {
    const handleGroupNodeRearrangement = (event) => {
      const nodeId = event.detail.nodeId;
      if (nodeId !== id) return;
      if (nodeHeaderRef.current) {
        const newHeight = nodeHeaderRef.current.offsetHeight;

        const nodes = event.detail.nodes;
        const targetNode = getNode(id);

        const updatedNodes = rearrangeChildNodesLayout(
          nodes,
          targetNode,
          newHeight,
        );

        setNodes(updatedNodes);
      }
    };

    const handleAddSubtopicFromEvent = (event) => {
      const nodeId = event.detail.nodeId;
      if (nodeId !== id) return;
      const parentNode = getNode(nodeId);

      const childNodes = getNodes().filter(
        (node) => node?.parentId === parentNode.id,
      );
      if (!parentNode) return;
      const newNodePosition = {
        x: parentNode.style.width * 0.05,
        y: nodeHeaderRef.current.offsetHeight + 20 + childNodes.length * 60,
      };
      const newSubtopicNode = createNewNode(
        'subtopic',
        userDetails?.email,
        newNodePosition,
        false,
        true,
        false,
        {
          parentId: id,
          extent: 'parent',
          connectable: true,
          draggable: true,
          style: { width: parentNode.style.width * 0.9 },
        },
      );
      setNodes((prevNodes) => {
        let updatedNodes = prevNodes;
        // updatedNodes = rearrangeChildNodesLayout([...updatedNodes, newSubtopicNode], parentNode, nodeHeaderRef.current.offsetHeight);
        let finalNodes = [...updatedNodes, newSubtopicNode];
        let finalEdges = getEdges();
        pushToHistory(
          finalNodes,
          finalEdges,
          USER_ROADMAP_HISTORY_ACTIONS.ADD_NODE.name,
          { message: 'Added a new module', node_id: [parentNode?.id] },
        );
        return finalNodes;
      });
    };

    window.addEventListener(
      'groupNode::rearrangeChildren',
      handleGroupNodeRearrangement,
    );
    window.addEventListener(
      'groupNode::addSubtopic',
      handleAddSubtopicFromEvent,
    );

    return () => {
      window.removeEventListener(
        'groupNode::rearrangeChildren',
        handleGroupNodeRearrangement,
      );
      window.removeEventListener(
        'groupNode::addSubtopic',
        handleAddSubtopicFromEvent,
      );
    };
  }, [id]);

  return (
    <>
      <div
        className={styles['subtopic-group-node-container']}
        data-node-type="subtopicGroup"
        data-node-id={id}
      >
        <div className={styles['label']} style={data?.style}>
          <div
            className={`${styles['node-header']} node-header`}
            ref={nodeHeaderRef}
            style={{ ...data?.headerStyle, height: 'fit-content' }}
          >
            {data?.label}
          </div>
          {/* <div   > */}
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
          {/* </div> */}
        </div>

        <Handle
          type="target"
          position={Position.Top}
          isConnectable={true}
          id="t2"
          style={{ zIndex: 9999 }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="l2"
          isConnectable={true}
          style={{ zIndex: 9999 }}
        />
        <Handle
          type="target"
          position={Position.Right}
          id="r2"
          isConnectable={true}
          style={{ zIndex: 9999 }}
        />
        {/* <Handle
          type="target"
          position={Position.Bottom}
          id="b2"
          isConnectable={true}
          style={{ zIndex: 9999 }}
        /> */}

        <Handle
          type="source"
          position={Position.Top}
          isConnectable={true}
          id="t1"
          style={{ zIndex: 9999 }}
        />
        <Handle
          type="source"
          position={Position.Left}
          id="l1"
          isConnectable={true}
          style={{ zIndex: 9999 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="r1"
          isConnectable={true}
          style={{ zIndex: 9999 }}
        />
        {/* <Handle
          type="source"
          position={Position.Bottom}
          id="b1"
          isConnectable={true}
          style={{ zIndex: 9999 }}
        /> */}

        {/* <SubTopicNode data={data} /> */}
        <NodeResizer
          color="transparent"
          lineStyle={{ borderWidth: '3px' }}
          handleStyle={{ display: 'none' }}
          onResizeEnd={handleResizeEnd}
        />
      </div>
    </>
  );
};

export default SubtopicGroupNode;
