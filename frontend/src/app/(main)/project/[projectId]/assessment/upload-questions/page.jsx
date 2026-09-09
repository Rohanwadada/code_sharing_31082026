import UploadQuestions from '@/components/project/assessment/UploadQuestions';

const Page = async ({ params }) => {
  const { projectId } = await params;

  return <UploadQuestions projectId={projectId} />;
};

export default Page;
