import ShifuSkillGapAnalysis from '@/components/assessment-attempt/SkillGapAnalysis';

const Page = async ({params}) => {
  const {allocationId} = await params;
  
  return <ShifuSkillGapAnalysis allocationId={allocationId} />;
};

export default Page;
