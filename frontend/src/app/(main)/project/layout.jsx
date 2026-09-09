import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './page.module.css';

export default function layout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'learner']}>
      <div className={styles['project-layout']} id="project-layout">
        <div className={styles['child-container']}>{children}</div>
      </div>
    </ProtectedRoute>
  );
}
