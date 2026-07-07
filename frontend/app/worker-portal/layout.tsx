import type { Metadata, Viewport } from 'next';
import RegisterSW from './RegisterSW';

export const metadata: Metadata = {
  title: 'WorkFlow — Worker Portal',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#FF5C3A',
  width: 'device-width',
  initialScale: 1,
};

export default function WorkerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterSW />
      {children}
    </>
  );
}
