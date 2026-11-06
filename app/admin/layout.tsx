import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '우밴추 관리자 대시보드',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

