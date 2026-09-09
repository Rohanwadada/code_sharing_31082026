import Dashboard from '@/components/dashboard/Dashboard';
import { ConfirmationProvider } from '@/context/ConfirmationContext';

export const metadata = {
  title: 'Dashboard',
  description: 'Dashboard',
};

const page = () => {
  return (
    <ConfirmationProvider>
      <Dashboard />
    </ConfirmationProvider>
  );
};

export default page;
