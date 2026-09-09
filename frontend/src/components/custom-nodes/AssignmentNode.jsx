import React from 'react';
import styles from './AssignmentNode.module.css';
import { Handle, Position } from '@xyflow/react';
import assignmentIcon from '@/assets/assignment-Icon.svg';
import NodeResizerCorners from './NodeResizerCorners';
import { isDarkColor } from '@/utils/helper';
import Image from 'next/image';

const AssignmentNode = ({ id, data, parentId }) => {
  return (
    <>
      <div className={styles['title-node-container']}>
        <div className={styles['label']} style={data?.style}>
          <Image
            className={styles['assignment-icon']}
            src={assignmentIcon}
            style={{
              filter: isDarkColor(data?.style?.backgroundColor)
                ? 'invert(1)'
                : 'none',
            }}
            alt=""
          />
          <div className={styles['node-label']}>{data?.label}</div>
        </div>

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

export default AssignmentNode;
