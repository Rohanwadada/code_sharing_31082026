import React from 'react';
import styles from './ParagraphNode.module.css';
import { Handle, NodeResizeControl, Position } from '@xyflow/react';
import NodeResizerCorners from './NodeResizerCorners';

const ParagraphNode = ({ id, data }) => {
  return (
    <>
      <div className={styles['paragraph-node-container']}>
        <p className={styles['content']} style={data?.style}>
          {data?.label}
        </p>

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

        <NodeResizerCorners id={id} />
      </div>
    </>
  );
};

export default ParagraphNode;
