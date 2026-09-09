import Header from '@/components/assessment-attempt/Header';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function layout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['learner', 'admin']}>
      {/* <Header />*/}
      {children}
    </ProtectedRoute>
  );
}
