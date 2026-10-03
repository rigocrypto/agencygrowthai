import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
