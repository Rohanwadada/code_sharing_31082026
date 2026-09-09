import RoadmapPreview from '@/components/roadmap-editor/RoadmapPerview';

const page = async ({ params }) => {
  const { roadmapId } = await params;
  console.log('In preview page: ', roadmapId);

  return <RoadmapPreview mode="preview" roadmapId={roadmapId} />;
};

export default page;
