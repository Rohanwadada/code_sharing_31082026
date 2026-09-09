import React from 'react';
import {
  Handle,
  NodeResizeControl,
  NodeResizer,
  Position,
} from '@xyflow/react';
import styles from './TitleNode.module.css';
import NodeResizerCorners from './NodeResizerCorners';

const TitleNode = ({ id, data, selected }) => {
  return (
    <>
      <div className={styles['title-node-container']}>
        <div className={styles['label']} style={data?.style}>
          {data?.label}
        </div>

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
          id="t"
        />
        <Handle
          type="source"
          position={Position.Left}
          id="l"
          isConnectable={true}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="r"
          isConnectable={true}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="b"
          isConnectable={true}
        />

        <NodeResizerCorners id={id} />
      </div>
    </>
  );
};

export default TitleNode;
