import CreateProject_v2 from '@/components/project/CreateProject_v2';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export const metadata = {
  title: 'Create New Project',
  description: 'Create New Project',
};

// #changes 28-09-2026 - start: ProtectedRoute wrapper for create-project page
const Page = () => {
  return (
    <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin', 'organization_admin', 'employee', 'user']}>
      <CreateProject_v2 />
    </ProtectedRoute>
  );
};
// #changes 28-09-2026 - end

export default Page;
