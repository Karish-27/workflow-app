'use client';
import { getInitials, getWorkerColor } from '../../lib/utils';

// ─── Avatar ────────────────────────────────────────────────────────
export function Avatar({ name, size = 36, index = 0 }: { name: string; size?: number; index?: number }) {
  const color = getWorkerColor(index);
  const radius = size * 0.28;
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Raleway',sans-serif", fontWeight: 800, fontSize: size * 0.35,
      color: '#fff', flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, color = '#3B82F6', icon,
}: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, borderRadius: '0 14px 0 60px', background: color, opacity: 0.1 }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Raleway',sans-serif", fontSize: 28, fontWeight: 800, color, letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────
export function Modal({
  open, onClose, title, children, maxWidth = 500,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B6B', padding: 4 }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────
export function EmptyState({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6B6B6B' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontFamily: "'Raleway',sans-serif", fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, marginBottom: 16 }}>{sub}</div>}
      {action}
    </div>
  );
}

// ─── PageHeader ────────────────────────────────────────────────────
export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: "'Raleway',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: '#6B6B6B', marginTop: 4 }}>{sub}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>}
    </div>
  );
}

// ─── SectionHeader ─────────────────────────────────────────────────
export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ fontFamily: "'Raleway',sans-serif", fontSize: 15, fontWeight: 700 }}>{title}</h3>
      {children}
    </div>
  );
}

// ─── LoadingRows ───────────────────────────────────────────────────
export function LoadingRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j}>
              <div className="animate-pulse" style={{ height: 14, background: '#E5E0D8', borderRadius: 4, width: j === 0 ? '60%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── AttendanceDot ─────────────────────────────────────────────────
export function AttendanceDot({
  status, onClick, size = 28,
}: {
  status: 'present' | 'absent' | 'halfday' | 'leave'; onClick?: () => void; size?: number;
}) {
  const cfg = {
    present: { bg: '#D1FAE5', color: '#065F46', label: 'P' },
    absent: { bg: '#FEE2E2', color: '#991B1B', label: 'A' },
    halfday: { bg: '#FEF3C7', color: '#92400E', label: 'H' },
    leave: { bg: '#DBEAFE', color: '#1E40AF', label: 'L' },
  }[status];

  return (
    <button
      onClick={onClick}
      title={status}
      style={{
        width: size, height: size, borderRadius: 6, border: 'none',
        background: cfg.bg, color: cfg.color, fontSize: size * 0.38, fontWeight: 700,
        cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.1s',
        fontFamily: "'DM Sans',sans-serif",
      }}
      onMouseEnter={e => onClick && ((e.target as HTMLElement).style.transform = 'scale(1.12)')}
      onMouseLeave={e => ((e.target as HTMLElement).style.transform = 'scale(1)')}
    >
      {cfg.label}
    </button>
  );
}
