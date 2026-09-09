import CreateRoadmapScreen from '@/components/roadmap-editor/CreateRoadmapScreen';

export const metadata = {
  title: 'Create Roadmap',
  description: 'Create Roadmap',
};

const page = async ({params}) => {
  const {projectId} = await params
  return <CreateRoadmapScreen projectId={projectId} />;
};

export default page;
