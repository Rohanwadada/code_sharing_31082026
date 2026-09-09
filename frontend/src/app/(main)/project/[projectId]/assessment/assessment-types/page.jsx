import AssessmentTypes from '@/components/project/assessment/AssessmentTypes';

const Page = async ({ params }) => {
  const { projectId } = await params;

  return <AssessmentTypes projectId={projectId} />;
};

export default Page;
