import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Header from '@/components/shared/Header';
import Sidebar from '@/components/shared/Sidebar';
import styles from './page.module.css';
import { PromptSharingProvider } from '@/context/PromptSharingContext';

export default function layout({ children }) {
  return (
    // #changes 28-09-2026 - start: Support all authenticated roles in layout ProtectedRoute
    <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin', 'organization_admin', 'employee', 'user']}>
    {/* #changes 28-09-2026 - end */}
      <PromptSharingProvider>
        <div className={styles['layout-container']} id="layout-container">
          <Sidebar />
          <div className={styles['bottom-container']}>
            <Header />
            <div className={styles['child-container']}>{children}</div>
          </div>
        </div>
      </PromptSharingProvider>
    </ProtectedRoute>
  );
}

