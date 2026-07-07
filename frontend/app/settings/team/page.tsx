'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../../components/layout/AppShell';
import SettingsNav from '../../../components/layout/SettingsNav';
import { PageHeader, Avatar } from '../../../components/ui';
import { teamApi } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import type { Member, Invite, Role } from '../../../types';

const ROLES: Role[] = ['admin', 'supervisor', 'accountant', 'viewer'];

const ROLE_DESC: Record<Role, string> = {
  admin: 'Full access including billing & team',
  supervisor: 'Mark attendance, read everything',
  accountant: 'Manage payments and salary',
  viewer: 'Read-only access',
};

export default function TeamSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canManage = user?.role === 'admin';

  const membersQ = useQuery({
    queryKey: ['team', 'members'],
    queryFn: () => teamApi.listMembers().then((r) => r.data),
  });
  const invitesQ = useQuery({
    queryKey: ['team', 'invites'],
    queryFn: () => teamApi.listInvites().then((r) => r.data),
    enabled: canManage,
  });

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('supervisor');

  const inviteMut = useMutation({
    mutationFn: () => teamApi.createInvite(inviteEmail, inviteRole),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['team'] });
      toast.success('Invitation sent');
      setInviteEmail('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Could not send invite'),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => teamApi.updateRole(id, role),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['team'] });
      toast.success('Role updated');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => teamApi.removeMember(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['team'] });
      toast.success('Member removed');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => teamApi.revokeInvite(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['team'] });
      toast.success('Invite revoked');
    },
  });

  const members: Member[] = membersQ.data?.members || [];
  const invites: Invite[] = invitesQ.data?.invites || [];
  const pendingInvites = invites.filter((i) => i.status === 'pending');

  return (
    <AppShell>
      <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
        <PageHeader title="Team" sub="Invite teammates and manage their access" />
        <SettingsNav />

        {canManage && (
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Invite a teammate</h2>
            <p style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 16 }}>
              They'll receive an email with a link to set their password. Invitations expire in 7 days.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inviteEmail) return;
                inviteMut.mutate();
              }}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end' }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@example.com" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <select className="form-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" type="submit" disabled={inviteMut.isPending}>
                {inviteMut.isPending ? 'Sending…' : 'Send invite'}
              </button>
            </form>
            <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 8 }}>
              <b>{inviteRole}</b>: {ROLE_DESC[inviteRole]}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
            Members ({members.length})
          </h2>
          {membersQ.isLoading ? (
            <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#6B6B6B', borderBottom: '1px solid #E5E0D8' }}>
                    <th style={{ padding: '8px 0', fontWeight: 600 }}>Member</th>
                    <th style={{ padding: '8px 0', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '8px 0', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '8px 0', fontWeight: 600 }}>Joined</th>
                    {canManage && <th style={{ padding: '8px 0', fontWeight: 600 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => (
                    <tr key={m._id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                      <td style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={m.name} size={32} index={idx} />
                          <div>
                            <div style={{ fontWeight: 600, color: '#1A1A1A' }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: '#6B6B6B' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 0' }}>
                        {canManage && !m.isOwner && m._id !== user?._id ? (
                          <select
                            className="form-input"
                            style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                            value={m.role}
                            onChange={(e) => roleMut.mutate({ id: m._id, role: e.target.value as Role })}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ textTransform: 'capitalize' }}>
                            {m.role}
                            {m.isOwner && ' (owner)'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 0' }}>
                        {m.emailVerified ? (
                          <span style={{ color: '#16A34A', fontSize: 12 }}>● Verified</span>
                        ) : (
                          <span style={{ color: '#F59E0B', fontSize: 12 }}>● Unverified</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 0', color: '#6B6B6B' }}>
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      {canManage && (
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          {!m.isOwner && m._id !== user?._id && (
                            <button
                              className="btn"
                              style={{ fontSize: 12, color: '#DC2626' }}
                              onClick={() => {
                                if (confirm(`Remove ${m.name} from the team?`)) removeMut.mutate(m._id);
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {canManage && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
              Pending invitations ({pendingInvites.length})
            </h2>
            {invitesQ.isLoading ? (
              <div style={{ color: '#6B6B6B', fontSize: 13 }}>Loading…</div>
            ) : pendingInvites.length === 0 ? (
              <div style={{ color: '#6B6B6B', fontSize: 13 }}>No pending invitations.</div>
            ) : (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#6B6B6B', borderBottom: '1px solid #E5E0D8' }}>
                      <th style={{ padding: '8px 0', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '8px 0', fontWeight: 600 }}>Role</th>
                      <th style={{ padding: '8px 0', fontWeight: 600 }}>Invited by</th>
                      <th style={{ padding: '8px 0', fontWeight: 600 }}>Expires</th>
                      <th style={{ padding: '8px 0', fontWeight: 600 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvites.map((inv) => (
                      <tr key={inv._id} style={{ borderBottom: '1px solid #F0EBE3' }}>
                        <td style={{ padding: '10px 0' }}>{inv.email}</td>
                        <td style={{ padding: '10px 0', textTransform: 'capitalize' }}>{inv.role}</td>
                        <td style={{ padding: '10px 0', color: '#6B6B6B' }}>{inv.invitedBy?.name || '—'}</td>
                        <td style={{ padding: '10px 0', color: '#6B6B6B' }}>
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          <button
                            className="btn"
                            style={{ fontSize: 12, color: '#DC2626' }}
                            onClick={() => revokeMut.mutate(inv._id)}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
