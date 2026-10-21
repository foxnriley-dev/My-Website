import { Suspense } from 'react';
import { SignUpForm } from '@/components/auth-forms';

export const metadata = { title: 'Sign up' };

export default function Page() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
