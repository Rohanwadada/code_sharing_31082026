import Section from '@/components/thread/Section';

const page = async ({ params }) => {
  const { threadId } = await params;
  return <Section threadIdFromUrl={threadId} />;
};

export default page;
