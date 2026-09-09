import React, { useContext } from 'react';
import { NodeResizeControl, useReactFlow } from '@xyflow/react';
import { RoadmapContext } from '@/context/RoadmapContext';
import { USER_ROADMAP_HISTORY_ACTIONS } from '@/utils/constants';

const controlStyle = {
  background: 'transparent',
  border: 'none',
};

const NodeResizerCorners = ({ id }) => {
  const { getNodes, getEdges } = useReactFlow();
  const { pushToHistory } = useContext(RoadmapContext);

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
        message: 'Changed the dimension of node, (height, width)',
        type: 'resize',
        source: 'canvas',
        node_id: [id],
        to: { height: height, width: width },
      },
    );
  };
  return (
    <>
      <NodeResizeControl
        style={controlStyle}
        position="bottom-left"
        onResizeEnd={handleResizeEnd}
        autoScale={false}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="black"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'absolute', left: 5, bottom: 5 }}
        >
          <path d="M17 7L7 17"></path>
          <path d="M7 7v10h10"></path>
        </svg>
      </NodeResizeControl>
      <NodeResizeControl
        style={controlStyle}
        position="bottom-right"
        onResizeEnd={handleResizeEnd}
        autoScale={false}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="black"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'absolute', right: 5, bottom: 5 }}
        >
          <path d="m7 7 10 10"></path>
          <path d="M17 7v10H7"></path>
        </svg>
      </NodeResizeControl>
    </>
  );
};

export default NodeResizerCorners;
