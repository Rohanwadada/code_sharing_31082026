import RoadmapDataViewer from '../roadmap/RoadmapDataViewer';
import styles from './RoadmapPreview.module.css';

const RoadmapPreview = ({ roadmapId }) => {
  return (
    <div className={styles['preview-container']}>
      <RoadmapDataViewer mode={'preview'} roadmapId={roadmapId} />
    </div>
  );
};

export default RoadmapPreview;
