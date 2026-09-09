import UploadCompetency from '@/components/project/assessment/UploadCompetency';

const Page = async ({ params }) => {
  const { projectId } = await params;

  return <UploadCompetency projectId={projectId} />;
};

export default Page;
