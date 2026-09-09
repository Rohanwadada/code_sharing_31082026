import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Header from '@/components/shared/Header';
import Sidebar from '@/components/shared/Sidebar';
import styles from './page.module.css';

export default function layout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['learner', 'admin']}>
      <div className={styles['layout-container']} id="layout-container">
        <Sidebar />
        <div className={styles['bottom-container']}>
          <Header />
          <div className={styles['child-container']}>{children}</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
