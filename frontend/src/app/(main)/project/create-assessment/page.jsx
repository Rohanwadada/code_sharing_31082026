import CreateSkillGapAssessment from '@/components/project/assessment/CreateSkillGapAssessment';
import ReviewCompetencies from '@/components/project/assessment/ReviewCompetencies';
import UploadQuestions from '@/components/project/assessment/UploadQuestions';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export const metadata = {
  title: 'Create Skill Gap Assessment',
  description: 'Create Skill Gap Assessment',
};

// #changes 28-09-2026 - start: ProtectedRoute wrapper for create-assessment page
const page = () => {
  return (
    <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin', 'organization_admin', 'employee', 'user']}>
      <CreateSkillGapAssessment />
    </ProtectedRoute>
  );
};
// #changes 28-09-2026 - end

export default page;
/*
/project/create-assessment
/project/[projectId]/assessment/assessment-types
/project/[projectId]/assessment/[assessmentId]/assessment-mode
*/
