import CreateRoadmapScreen from '@/components/roadmap-editor/CreateRoadmapScreen';
import NewRoadmapCreationModeSelectionPage from '@/components/roadmap/NewRoadmapCreationModeSelectionPage';

export const metadata = {
  title: 'New Roadmap',
  description: 'New Roadmap',
};

const page = async ({params}) => {
  const {projectId} = await params
  return <NewRoadmapCreationModeSelectionPage projectId={projectId} />;
};

export default page;
