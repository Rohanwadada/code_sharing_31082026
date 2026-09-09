import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './layout.module.css';

export default function layout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'learner']}>
      <div className={styles['layout-container']}>{children}</div>
    </ProtectedRoute>
  );
}
