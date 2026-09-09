import RoadmapEditor from '@/components/roadmap-editor/RoadmapEditor';
import { RoadmapProvider } from '@/context/RoadmapContext';
import { ReactFlowProvider } from '@xyflow/react';

export const metadata = {
  title: 'Draw Roadmap',
  description: 'Draw Roadmap',
};

const page = async ({ params }) => {
  const { roadmapId } = await params;

  return (
    <ReactFlowProvider>
      <RoadmapProvider>
        <RoadmapEditor roadmapId={roadmapId} />;
      </RoadmapProvider>
    </ReactFlowProvider>
  );
};

export default page;
