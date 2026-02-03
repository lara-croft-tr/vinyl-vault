'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSharePage = pathname.startsWith('/share');

  if (isSharePage) {
    // No sidebar for public share pages
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-4 pt-20 md:p-8 md:pt-8 md:ml-64">
        {children}
      </main>
    </div>
  );
}
