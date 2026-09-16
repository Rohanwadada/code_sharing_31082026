import Section from '@/components/thread/Section';

const page = async ({ params }) => {
  const { threadId, projectId } = await params;
  return <Section threadIdFromUrl={threadId} projectId={projectId} />;
};

export default page;
