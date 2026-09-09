import QuestionsStructure from '@/components/project/assessment/QuestionsStructure';

const Page = async ({ params }) => {
  const { projectId, assessmentId } = await params;

  return (
    <QuestionsStructure projectId={projectId} assessmentId={assessmentId} />
  );
};

export default Page;
