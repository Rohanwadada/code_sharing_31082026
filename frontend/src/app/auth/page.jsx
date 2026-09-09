import Login from '@/components/auth/Login';
import React, { Suspense } from 'react';

export const metadata = {
  title: 'Login',
};

const page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Login />
    </Suspense>
  );
};

export default page;
