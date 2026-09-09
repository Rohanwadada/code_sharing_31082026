import NodeContentMarkdownRenderer from '@/components/roadmap/NodeContentMarkdownRenderer';
import styles from './Text.module.css';

const Text = ({ text }) => {
  return (
    text &&
    text !== '' && (
      <div className={styles['text-message-ct']}>
        {/* {text} */}
        <NodeContentMarkdownRenderer content={text} />
      </div>
    )
  );
};

export default Text;
