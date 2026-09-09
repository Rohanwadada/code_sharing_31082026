import EmptyState from '@/components/thread/EmptyState';

const page = async({params}) => {
  const {projectId} = await params
  return (
    <>
      <EmptyState projectId={projectId} />
    </>
  );
};

export default page;
