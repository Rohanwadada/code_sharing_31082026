import ShifuSendAssessment from '@/components/project/assessment/SendAssessment';

const Page = async ({ params }) => {
  const { projectId, assessmentId } = await params;
  return <ShifuSendAssessment projectId={projectId} assessmentId={assessmentId} />;
};

export default Page;
