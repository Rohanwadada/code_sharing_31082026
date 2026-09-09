import QuestionSource from '@/components/project/assessment/QuestionSource';

const Page = async ({ params }) => {
  const { projectId } = await params;
  return <QuestionSource projectId={projectId} />;
};

export default Page;
