import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AMAZ Coffee — Panel Admin',
  description: 'Panel de administración AMAZ Coffee',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
