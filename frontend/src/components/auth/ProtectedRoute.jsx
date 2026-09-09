'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const router = useRouter();
  const pathname = usePathname();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isLoading = useAuthStore((s) => s.isLoading);
  const userDetails = useAuthStore((s) => s.userDetails);

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn) {
      const currentUrl =
        pathname + window.location.search + window.location.hash;
      router.replace(`/login?next=${encodeURIComponent(currentUrl)}`);
      return;
    }

    if (
      allowedRoles &&
      userDetails &&
      !allowedRoles.includes(userDetails?.role)
    ) {
      router.replace('/dashboard');
    }
  }, [isLoggedIn, isLoading, userDetails, allowedRoles, router, pathname]);

  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          backgroundColor: 'var(--background)',
        }}
      />
    );
  }

  if (!isLoggedIn || isLoading) return null;

  return children;
}
