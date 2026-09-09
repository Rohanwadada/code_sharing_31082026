import AiGenerateProcess from '@/components/project/assessment/AiGenerateProcess';

export const metadata = {
  title: 'Review Competency',
  description: 'Review Competency',
};

const page = async ({ params }) => {
  const { projectId } = await params;
  return <AiGenerateProcess projectId={projectId} />;
};

export default page;
