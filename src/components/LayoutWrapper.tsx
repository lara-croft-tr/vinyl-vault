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
      <main className="flex-1 p-8 ml-64">
        {children}
      </main>
    </div>
  );
}
