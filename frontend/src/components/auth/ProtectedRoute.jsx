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

    // #changes 28-09-2026 - start: Normalized role matching with lowercase support
    if (allowedRoles && userDetails) {
      const userRole = (userDetails?.role || userDetails?.provided_role || '').toLowerCase().trim();
      const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());
      if (!normalizedAllowed.includes(userRole)) {
        router.replace('/dashboard');
      }
    }
    // #changes 28-09-2026 - end
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
