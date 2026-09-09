import AssessmentMode from '@/components/project/assessment/AssessmentMode';

const Page = async ({ params }) => {
  const { projectId, assessmentId } = await params;

  return <AssessmentMode projectId={projectId} assessmentId={assessmentId} />;
};

export default Page;
