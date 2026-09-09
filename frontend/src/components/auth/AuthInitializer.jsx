'use client';

import { useEffect } from 'react';
import { initialize } from '@/service/auth.service';

export default function AuthInitializer() {
  useEffect(() => {
    initialize();
  }, []);

  return null;
}
