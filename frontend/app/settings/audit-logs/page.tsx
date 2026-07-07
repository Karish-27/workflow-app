'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../../../components/layout/AppShell';
import SettingsNav from '../../../components/layout/SettingsNav';
import { PageHeader } from '../../../components/ui';
import { organizationApi } from '../../../lib/api';
import type { AuditLogEntry } from '../../../types';

const ACTION_LABELS: Record<string, string> = {
  'org.create': 'Created organization',
  'org.update': 'Updated organization',
  'worker.create': 'Added worker',
  'worker.update': 'Updated worker',
  'worker.delete': 'Archived worker',
  'worker.restore': 'Restored worker',
  'attendance.mark': 'Marked attendance',
  'attendance.bulk_mark': 'Bulk-marked attendance',
  'attendance.delete': 'Deleted attendance',
  'payment.create': 'Created payment',
  'payment.delete': 'Archived payment',
  'member.role.update': 'Changed member role',
  'member.remove': 'Removed member',
  'invite.create': 'Sent invitation',
  'invite.revoke': 'Revoked invitation',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => organizationApi.auditLogs({ page, limit: 25 }).then((r) => r.data),
  });

  const logs: AuditLogEntry[] = data?.logs || [];

  return (
    <AppShell>
      <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
        <PageHeader title="Audit log" sub="Every meaningful action taken in this organization" />
        <SettingsNav />

        <div className="card" style={{ padding: 24 }}>
          {isLoading ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
          ) : logs.length === 0 ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>No activity yet.</div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#6B6B6B', borderBottom: '1px solid #E5E0D8' }}>
                    <th style={{ padding: '8px 0', fontWeight: 600 }}>When</th>
                    <th style={{ padding: '8px 0', fontWeight: 600 }}>Who</th>
                    <th style={{ padding: '8px 0', fontWeight: 600 }}>Action</th>
                    <th style={{ padding: '8px 0', fontWeight: 600 }}>Resource</th>
                    <th style={{ padding: '8px 0', fontWeight: 600 }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                      <td style={{ padding: '10px 0', color: '#6B6B6B', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 0' }}>
                        {log.actor?.name || log.actorEmail || '—'}
                      </td>
                      <td style={{ padding: '10px 0' }}>
                        {ACTION_LABELS[log.action] || log.action}
                      </td>
                      <td style={{ padding: '10px 0', color: '#6B6B6B' }}>
                        {log.resource}
                        {log.resourceId ? ` · ${log.resourceId.slice(-6)}` : ''}
                      </td>
                      <td style={{ padding: '10px 0', color: '#6B6B6B', fontFamily: 'monospace', fontSize: 11 }}>
                        {log.ip || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data?.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13 }}>
              <span style={{ color: '#6B6B6B' }}>
                Page {data.page} of {data.pages} · {data.total} entries
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <button className="btn" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
