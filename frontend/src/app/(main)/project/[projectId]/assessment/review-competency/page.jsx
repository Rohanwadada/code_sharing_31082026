import ReviewCompetencies from '@/components/project/assessment/ReviewCompetencies';

export const metadata = {
  title: 'Review Competency',
  description: 'Review Competency',
};

const page = async ({ params }) => {
  const { projectId } = await params;
  return <ReviewCompetencies projectId={projectId} />;
};

export default page;
