import ReviewCompetencies from '@/components/project/assessment/ReviewCompetencies';
import SourceOfCompetencies from '@/components/project/assessment/SourceOfCompetencies';

export const metadata = {
  title: 'Choose Competency Source',
  description: 'Choose Competency Source',
};

const page = async ({ params }) => {
  const { projectId } = await params;
  return <SourceOfCompetencies projectId={projectId} />;
};

export default page;
