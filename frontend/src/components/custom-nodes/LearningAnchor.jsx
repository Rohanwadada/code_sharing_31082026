import { Handle, Position } from '@xyflow/react';
import styles from './LearningAnchor.module.css';
import NodeResizerCorners from './NodeResizerCorners';

const LearningAnchor = ({ id, data }) => {
  return (
    <>
      <div className={styles['learning-anchor-node-container']}>
        <div className={styles['label']} style={data?.style}>
          {data?.label}
        </div>

        <Handle
          type="target"
          position={Position.Top}
          isConnectable={true}
          id="t"
        />
        <NodeResizerCorners id={id} />
      </div>
    </>
  );
};

export default LearningAnchor;
