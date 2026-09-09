import CreateSkillGapAssessment from '@/components/project/assessment/CreateSkillGapAssessment';
import ReviewCompetencies from '@/components/project/assessment/ReviewCompetencies';
import UploadQuestions from '@/components/project/assessment/UploadQuestions';

export const metadata = {
  title: 'Create Skill Gap Assessment',
  description: 'Create Skill Gap Assessmen',
};

const page = async () => {
  return <CreateSkillGapAssessment />;
};

export default page;
/*
/project/create-assessment
/project/[projectId]/assessment/assessment-types
/project/[projectId]/assessment/[assessmentId]/assessment-mode
*/
