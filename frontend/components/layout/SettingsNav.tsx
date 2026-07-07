'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/settings/organization', label: 'Organization' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/audit-logs', label: 'Audit log' },
];

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #E5E0D8' }}>
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              color: active ? '#1A1A1A' : '#6B6B6B',
              borderBottom: `2px solid ${active ? '#FF5C3A' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
