import RoadmapDataViewer from '@/components/roadmap/RoadmapDataViewer';
import styles from './page.module.css';

const page = async ({ params }) => {
  const { roadmapId, projectId } = await params;

  return (
    <div className={styles['main-container']}>
      <RoadmapDataViewer roadmapId={roadmapId} artifactSubtype={'content'} projectId={projectId} />
    </div>
  );
};

export default page;
