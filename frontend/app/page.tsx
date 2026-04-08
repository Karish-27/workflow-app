'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

/* ─── tiny helpers ──────────────────────────────────────────────── */
const ATT: Record<string, { bg: string; color: string; short: string }> = {
  present:  { bg: '#D1FAE5', color: '#065F46', short: 'P'  },
  absent:   { bg: '#FEE2E2', color: '#991B1B', short: 'A'  },
  halfday:  { bg: '#FEF3C7', color: '#92400E', short: 'H'  },
  leave:    { bg: '#EDE9FE', color: '#5B21B6', short: 'L'  },
  none:     { bg: '#F3F4F6', color: '#9CA3AF', short: '·'  },
};

function Dot({ s }: { s: string }) {
  const c = ATT[s] || ATT.none;
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 6,
      background: c.bg, color: c.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800,
    }}>{c.short}</div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function HomePage() {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaq, setOpenFaq]       = useState<number | null>(null);

  const checkAuth = () => setIsLoggedIn(!!localStorage.getItem('wf_token'));

  useEffect(() => {
    // Synchronous — no API call, no blank-page risk on back navigation
    checkAuth();
    // Also re-check when page is restored from bfcache (browser back button)
    window.addEventListener('pageshow', checkAuth);
    return () => window.removeEventListener('pageshow', checkAuth);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans',sans-serif", color: '#1A1A1A' }}>

      {/* ══════════════════ NAVBAR ══════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F0EDE8', height: 68, padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, background: '#FF5C3A', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800 }}>WorkFlow</span>
        </div>

        <div className="lp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {['Features','How it Works','FAQ'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`} style={{ fontSize: 14, fontWeight: 500, color: '#444', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#FF5C3A')}
              onMouseLeave={e => (e.currentTarget.style.color = '#444')}>{l}</a>
          ))}
        </div>

        <div className="lp-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isLoggedIn ? (
            <Link href="/dashboard" style={{ padding: '9px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#FF5C3A' }}>
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ padding: '9px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1A1A1A', textDecoration: 'none', border: '1.5px solid #E0DBD4' }}>
                Log In
              </Link>
              <Link href="/register" style={{ padding: '9px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#FF5C3A' }}>
                Sign Up Free
              </Link>
            </>
          )}
        </div>

        <button className="lp-nav-mobile" onClick={() => setMenuOpen(o => !o)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg width="24" height="24" fill="none" stroke="#1A1A1A" strokeWidth="2" viewBox="0 0 24 24">
            {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </nav>

      {menuOpen && (
        <div style={{ position: 'fixed', top: 68, left: 0, right: 0, zIndex: 99, background: '#fff', borderBottom: '1px solid #F0EDE8', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          {isLoggedIn ? (
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ padding: '13px 16px', borderRadius: 10, fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#FF5C3A', textAlign: 'center' }}>Go to Dashboard →</Link>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ padding: '13px 16px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#1A1A1A', textDecoration: 'none', border: '1.5px solid #E0DBD4', textAlign: 'center' }}>Log In</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} style={{ padding: '13px 16px', borderRadius: 10, fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#FF5C3A', textAlign: 'center' }}>Sign Up Free</Link>
            </>
          )}
        </div>
      )}

      {/* ══════════════════ HERO ══════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '76px 32px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }} className="lp-hero-grid">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFF4F1', border: '1px solid #FFD5CC', borderRadius: 99, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#FF5C3A' }}>Made for Indian construction & field businesses</span>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(34px,4.5vw,58px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Stop tracking workers<br />on <span style={{ textDecoration: 'line-through', color: '#C8C2B8' }}>paper</span>{' '}
            <span style={{ color: '#FF5C3A' }}>in one app.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#5A5A5A', lineHeight: 1.75, marginBottom: 36, maxWidth: 440 }}>
            WorkFlow replaces your attendance register and salary Excel sheet. Mark attendance, calculate payroll, track advances — all in one simple dashboard.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <Link href="/register" style={{ padding: '14px 30px', borderRadius: 12, fontSize: 16, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#FF5C3A', boxShadow: '0 4px 20px rgba(255,92,58,0.3)' }}>
              Start Free — No Card Needed
            </Link>
            <Link href="/login" style={{ padding: '14px 30px', borderRadius: 12, fontSize: 16, fontWeight: 600, color: '#1A1A1A', textDecoration: 'none', background: '#F5F2EE', border: '1px solid #E0DBD4' }}>
              Sign In
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['Free forever plan', 'No Excel needed', 'Works on mobile'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B6B6B' }}>
                <span style={{ color: '#10B981', fontWeight: 800 }}>✓</span> {t}
              </div>
            ))}
          </div>
        </div>

        {/* Hero — Dashboard mockup */}
        <div className="lp-hero-mock" style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#1A1A1A', borderRadius: 22, padding: '12px 12px 0', width: '100%', maxWidth: 400, boxShadow: '0 40px 100px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10, paddingLeft: 2 }}>
              {['#FF5F57','#FFBD2E','#28C840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ background: '#F7F4EF', borderRadius: '12px 12px 0 0', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800 }}>Good morning, Karishma 👋</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B' }}>Tuesday, 08 April 2025</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ padding: '5px 10px', borderRadius: 8, background: '#fff', border: '1px solid #E5E0D8', fontSize: 11, fontWeight: 600 }}>+ Worker</div>
                  <div style={{ padding: '5px 10px', borderRadius: 8, background: '#FF5C3A', fontSize: 11, fontWeight: 600, color: '#fff' }}>Attendance</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Total Workers', val: '24', sub: '22 active', color: '#3B82F6' },
                  { label: 'Present Today', val: '19', sub: '3 not marked', color: '#10B981' },
                  { label: 'Absent Today', val: '2', sub: '1 on leave', color: '#FF5C3A' },
                  { label: 'Payable', val: '₹84K', sub: 'This month', color: '#F59E0B' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '10px 10px', border: '1px solid #E5E0D8' }}>
                    <div style={{ fontSize: 9, color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 900, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: '#9E9E9E', marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E0D8', overflow: 'hidden' }}>
                <div style={{ padding: '7px 12px', borderBottom: '1px solid #E5E0D8', fontSize: 10, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Today's Attendance</span><span style={{ color: '#FF5C3A' }}>View all →</span>
                </div>
                {[
                  { name: 'Ravi Kumar',   role: 'Mason',       status: 'present' },
                  { name: 'Suresh Yadav', role: 'Helper',      status: 'present' },
                  { name: 'Pooja Devi',   role: 'Electrician', status: 'absent'  },
                  { name: 'Arjun Singh',  role: 'Plumber',     status: 'halfday' },
                ].map((w, i) => (
                  <div key={w.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: i < 3 ? '1px solid #F0EDE8' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 7, background: '#FF5C3A22', color: '#FF5C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{w.name[0]}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{w.name}</div>
                        <div style={{ fontSize: 9, color: '#6B6B6B' }}>{w.role}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {['present','absent','halfday','leave'].map(s => (
                        <div key={s} style={{ width: 22, height: 22, borderRadius: 5, background: w.status === s ? ATT[s].bg : '#F3F4F6', color: w.status === s ? ATT[s].color : '#C8C2B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800 }}>
                          {ATT[s].short}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ SOCIAL PROOF STRIP ══════════════════ */}
      <div style={{ background: '#F7F4EF', borderTop: '1px solid #EDE9E2', borderBottom: '1px solid #EDE9E2', padding: '18px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#9E9E9E', fontWeight: 500 }}>Trusted by businesses across India</span>
          {[{ val: '10,000+', lbl: 'Workers Tracked' }, { val: '500+', lbl: 'Businesses' }, { val: '₹50Cr+', lbl: 'Salary Processed' }, { val: '4.9★', lbl: 'Avg. Rating' }].map(s => (
            <div key={s.lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 900, color: '#FF5C3A' }}>{s.val}</div>
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════ FEATURES ══════════════════ */}
      <section id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 32px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#FF5C3A', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>Everything in one place</p>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 900, marginBottom: 14 }}>Four modules. Zero confusion.</h2>
          <p style={{ fontSize: 16, color: '#6B6B6B', maxWidth: 500, margin: '0 auto' }}>WorkFlow covers every step — from onboarding a worker to paying their monthly salary.</p>
        </div>

        {/* ── Feature 1: Attendance ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 52, alignItems: 'center', marginBottom: 88 }} className="lp-feat-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EFF6FF', borderRadius: 8, padding: '6px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: 18 }}>🗓️</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8' }}>Attendance</span>
            </div>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(22px,2.5vw,32px)', fontWeight: 800, marginBottom: 14 }}>Full monthly calendar — mark in seconds</h3>
            <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.75, marginBottom: 20 }}>
              See your entire team's attendance on a single grid. Click any cell to cycle through Present, Absent, Half Day, or Leave. Hit Save — done.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Full-day, Half-day, Leave, Overtime support',
                '"Mark All Present" with one click',
                'Auto-calculates estimated pay per worker',
                'Highlighted unsaved changes before you save',
                'Navigate any month/year freely',
              ].map(t => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#3A3A3A' }}>
                  <span style={{ color: '#10B981', fontWeight: 800, marginTop: 1 }}>✓</span> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Attendance mockup */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E0D8', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E0D8', background: '#FAFAF8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800 }}>Attendance — April 2025</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ padding: '4px 10px', borderRadius: 7, background: '#fff', border: '1px solid #E5E0D8', fontSize: 11, fontWeight: 600 }}>Mark All Present</div>
                <div style={{ padding: '4px 10px', borderRadius: 7, background: '#10B981', fontSize: 11, fontWeight: 700, color: '#fff' }}>Save (3)</div>
              </div>
            </div>
            {/* Legend */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #E5E0D8', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[['present','Present'],['absent','Absent'],['halfday','Half Day'],['leave','Leave']].map(([k,l]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: ATT[k].bg, color: ATT[k].color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800 }}>{ATT[k].short}</div>
                  <span style={{ fontSize: 10, color: '#6B6B6B' }}>{l}</span>
                </div>
              ))}
            </div>
            {/* Header row */}
            <div style={{ padding: '0 16px', borderBottom: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', background: '#FAFAF8', height: 32 }}>
              <div style={{ minWidth: 120, fontSize: 10, fontWeight: 700, color: '#9E9E9E', textTransform: 'uppercase' }}>Worker</div>
              <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                {[1,2,3,4,5,6,7,8].map(d => <div key={d} style={{ width: 24, textAlign: 'center', fontSize: 10, fontWeight: 700, color: d === 8 ? '#FF5C3A' : '#9E9E9E' }}>{d}</div>)}
                <div style={{ fontSize: 10, color: '#9E9E9E', alignSelf: 'center', paddingLeft: 4 }}>…</div>
              </div>
              <div style={{ minWidth: 60, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9E9E9E', textTransform: 'uppercase' }}>Est. Pay</div>
            </div>
            {/* Worker rows */}
            {[
              { name: 'Ravi Kumar',   role: 'Mason',  days: ['present','present','present','absent','present','present','halfday','present'],  pay: '₹4,800' },
              { name: 'Suresh Yadav', role: 'Helper', days: ['present','present','halfday','present','present','absent','present','present'],   pay: '₹3,600' },
              { name: 'Pooja Devi',   role: 'Electrician', days: ['present','present','present','present','leave','present','present','absent'], pay: '₹5,200' },
            ].map((w, ri) => (
              <div key={w.name} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: ri < 2 ? '1px solid #F0EDE8' : 'none', background: ri === 1 ? '#FFFBF5' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: ['#DBEAFE','#D1FAE5','#EDE9FE'][ri], color: ['#1D4ED8','#065F46','#5B21B6'][ri], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{w.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{w.name.split(' ')[0]}</div>
                    <div style={{ fontSize: 9, color: '#6B6B6B' }}>{w.role}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                  {w.days.map((d, i) => <Dot key={i} s={d} />)}
                  <div style={{ fontSize: 10, color: '#9E9E9E', alignSelf: 'center', paddingLeft: 4 }}>…</div>
                </div>
                <div style={{ minWidth: 60, textAlign: 'right', fontSize: 12, fontWeight: 800, color: '#10B981', fontFamily: "'Syne',sans-serif" }}>{w.pay}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feature 2: Workers ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 52, alignItems: 'center', marginBottom: 88 }} className="lp-feat-grid lp-feat-reverse">
          {/* Workers mockup */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="lp-feat-order-2">
            {[
              { name: 'Ravi Kumar',   role: 'Mason',       wage: '₹600/day',  status: 'active',   color: '#DBEAFE', textColor: '#1D4ED8', joined: '12 Jan 2024' },
              { name: 'Pooja Sharma', role: 'Electrician', wage: '₹800/day',  status: 'active',   color: '#D1FAE5', textColor: '#065F46', joined: '03 Mar 2024' },
              { name: 'Suresh Yadav', role: 'Helper',      wage: '₹450/day',  status: 'inactive', color: '#FEF3C7', textColor: '#92400E', joined: '22 Aug 2023' },
              { name: 'Arjun Singh',  role: 'Plumber',     wage: '₹18,000/mo',status: 'active',   color: '#EDE9FE', textColor: '#5B21B6', joined: '01 Feb 2025' },
            ].map(w => (
              <div key={w.name} style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #E5E0D8', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: w.color, color: w.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800 }}>{w.name[0]}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: w.status === 'active' ? '#D1FAE5' : '#F3F4F6', color: w.status === 'active' ? '#065F46' : '#6B6B6B' }}>{w.status}</span>
                </div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, marginBottom: 2 }}>{w.name}</div>
                <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 10 }}>{w.role}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 10, borderTop: '1px solid #F0EDE8' }}>
                  <div><div style={{ fontSize: 9, color: '#9E9E9E' }}>Wage</div><div style={{ fontSize: 11, fontWeight: 700 }}>{w.wage}</div></div>
                  <div><div style={{ fontSize: 9, color: '#9E9E9E' }}>Joined</div><div style={{ fontSize: 11, fontWeight: 600 }}>{w.joined}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                  <div style={{ flex: 1, padding: '5px 0', borderRadius: 7, background: '#F5F2EE', border: '1px solid #E5E0D8', fontSize: 10, fontWeight: 600, textAlign: 'center', color: '#444' }}>View Salary</div>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#F5F2EE', border: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" fill="none" stroke="#6B6B6B" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lp-feat-order-1">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#D1FAE5', borderRadius: 8, padding: '6px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: 18 }}>👷</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>Worker Management</span>
            </div>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(22px,2.5vw,32px)', fontWeight: 800, marginBottom: 14 }}>Every worker's details, always at your fingertips</h3>
            <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.75, marginBottom: 20 }}>
              Add workers in seconds. Store their phone number, role, joining date, wage rate, and notes. Filter, search, and manage your entire workforce from one screen.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Daily or Monthly wage types supported',
                'Job roles: Mason, Helper, Electrician, Plumber, and more',
                'Overtime rate tracking per worker',
                'Active / Inactive status — never lose old records',
                'Quick access to each worker\'s full salary history',
              ].map(t => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#3A3A3A' }}>
                  <span style={{ color: '#10B981', fontWeight: 800, marginTop: 1 }}>✓</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Feature 3: Payroll ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 52, alignItems: 'center', marginBottom: 88 }} className="lp-feat-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ECFDF5', borderRadius: 8, padding: '6px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: 18 }}>💰</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>Payroll & Salary</span>
            </div>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(22px,2.5vw,32px)', fontWeight: 800, marginBottom: 14 }}>Salary calculated automatically — zero manual math</h3>
            <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.75, marginBottom: 20 }}>
              WorkFlow uses the attendance you've already marked to compute gross salary, deduct advances, and show the exact net amount to pay. Cash, Bank Transfer, UPI, or Cheque — you choose.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Auto-calculates from present days × daily wage',
                'Half-day = 50% of daily wage, automatically',
                'Deduct advances and penalties in one step',
                'Pay via Cash, UPI, Bank Transfer, or Cheque',
                'Instant salary slip generation per worker',
              ].map(t => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#3A3A3A' }}>
                  <span style={{ color: '#10B981', fontWeight: 800, marginTop: 1 }}>✓</span> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Payroll mockup */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E0D8', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E0D8', background: '#FAFAF8' }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, marginBottom: 2 }}>Ravi Kumar — Salary Slip</div>
              <div style={{ fontSize: 11, color: '#6B6B6B' }}>March 2025 · Mason · ₹600/day</div>
            </div>
            <div style={{ padding: 16 }}>
              {/* Attendance summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                {[{ l: 'Present', v: '24', c: '#065F46', bg: '#D1FAE5' }, { l: 'Absent', v: '2', c: '#991B1B', bg: '#FEE2E2' }, { l: 'Half Day', v: '3', c: '#92400E', bg: '#FEF3C7' }, { l: 'Leave', v: '1', c: '#5B21B6', bg: '#EDE9FE' }].map(s => (
                  <div key={s.l} style={{ background: s.bg, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: s.c, fontFamily: "'Syne',sans-serif" }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: s.c, fontWeight: 600 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {/* Calculation breakdown */}
              <div style={{ background: '#F7F4EF', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                {[
                  { l: 'Gross Salary (24 days × ₹600)', v: '₹14,400', color: '#1A1A1A' },
                  { l: 'Half Day Deduction (3 × ₹300)', v: '−₹900', color: '#EF4444' },
                  { l: 'Advance Deduction', v: '−₹2,000', color: '#EF4444' },
                ].map((r, i) => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < 2 ? '1px solid #E5E0D8' : 'none' }}>
                    <span style={{ fontSize: 12, color: '#6B6B6B' }}>{r.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1A1A1A', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Net Salary to Pay</span>
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 900, color: '#10B981' }}>₹11,500</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['Cash','UPI','Bank Transfer','Cheque'].map(m => (
                  <div key={m} style={{ padding: '8px 12px', borderRadius: 8, border: m === 'UPI' ? '2px solid #FF5C3A' : '1px solid #E5E0D8', background: m === 'UPI' ? '#FFF4F1' : '#fff', fontSize: 12, fontWeight: 600, textAlign: 'center', color: m === 'UPI' ? '#FF5C3A' : '#444' }}>{m}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature 4: Payments ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 52, alignItems: 'center' }} className="lp-feat-grid lp-feat-reverse">
          {/* Payments mockup */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E0D8', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }} className="lp-feat-order-2">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: '1px solid #E5E0D8' }}>
              {[{ l: 'Total Paid', v: '₹2,84,500', c: '#10B981' }, { l: 'Via Cash', v: '₹1,20,000', c: '#F59E0B' }, { l: 'Bank / UPI', v: '₹1,64,500', c: '#3B82F6' }].map((s, i) => (
                <div key={s.l} style={{ padding: '14px 16px', borderRight: i < 2 ? '1px solid #E5E0D8' : 'none', background: '#FAFAF8' }}>
                  <div style={{ fontSize: 10, color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{s.l}</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 900, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFAF8' }}>
                  {['Worker','Period','Gross','Net Paid','Method','Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: 9, fontWeight: 700, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left', borderBottom: '1px solid #E5E0D8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Ravi Kumar',   role: 'Mason',  period: 'Mar 2025', gross: '₹14,400', net: '₹11,500', method: 'UPI',   mColor: 'badge-purple', status: 'Paid', sColor: '#D1FAE5', stColor: '#065F46' },
                  { name: 'Suresh Yadav', role: 'Helper', period: 'Mar 2025', gross: '₹11,250', net: '₹9,800',  method: 'Cash',  mColor: 'badge-green',  status: 'Paid', sColor: '#D1FAE5', stColor: '#065F46' },
                  { name: 'Pooja Devi',   role: 'Elec.',  period: 'Mar 2025', gross: '₹19,200', net: '₹17,000', method: 'Bank',  mColor: 'badge-blue',   status: 'Pending', sColor: '#FEF3C7', stColor: '#92400E' },
                ].map((p, i) => (
                  <tr key={p.name} style={{ borderBottom: i < 2 ? '1px solid #F0EDE8' : 'none' }}>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 9, color: '#6B6B6B' }}>{p.role}</div>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 10, color: '#6B6B6B' }}>{p.period}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11, fontWeight: 600 }}>{p.gross}</td>
                    <td style={{ padding: '9px 12px', fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 900, color: '#10B981' }}>{p.net}</td>
                    <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#DBEAFE', color: '#1D4ED8' }}>{p.method}</span></td>
                    <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: p.sColor, color: p.stColor }}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lp-feat-order-1">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFF4F1', borderRadius: 8, padding: '6px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#FF5C3A' }}>Payment History</span>
            </div>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(22px,2.5vw,32px)', fontWeight: 800, marginBottom: 14 }}>Every rupee tracked, every payment recorded</h3>
            <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.75, marginBottom: 20 }}>
              A full log of every salary payment, advance, and transaction — searchable, filterable, and always accurate. Never dispute a payment again.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Full breakdown: Gross → Deductions → Net paid',
                'Filter by worker, month, or payment method',
                'Tracks Cash, UPI, Bank Transfer & Cheque separately',
                'Monthly stats — total paid, pending, and more',
                'Paginated history — scroll through years of records',
              ].map(t => (
                <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#3A3A3A' }}>
                  <span style={{ color: '#10B981', fontWeight: 800, marginTop: 1 }}>✓</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section id="how-it-works" style={{ background: '#F7F4EF', borderTop: '1px solid #EDE9E2', padding: '88px 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FF5C3A', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>Simple by design</p>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, marginBottom: 12 }}>From signup to first payroll in under 5 minutes</h2>
            <p style={{ fontSize: 16, color: '#6B6B6B', maxWidth: 480, margin: '0 auto' }}>No training, no onboarding call, no manual to read. Just open WorkFlow and go.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { step: '01', emoji: '📝', title: 'Create your account', desc: 'Sign up with your name, business, and email. Takes 30 seconds — no card required.' },
              { step: '02', emoji: '👷', title: 'Add your workers', desc: 'Enter each worker\'s name, role, and daily or monthly wage. Add as many as you need.' },
              { step: '03', emoji: '🗓️', title: 'Mark daily attendance', desc: 'Every day, open the app and mark Present, Absent, Half Day, or Leave for each worker.' },
              { step: '04', emoji: '💸', title: 'Pay salary in one click', desc: 'WorkFlow calculates the net salary automatically. Review, choose payment method, and mark paid.' },
            ].map(s => (
              <div key={s.step} style={{ background: '#fff', borderRadius: 18, padding: '28px 22px', border: '1px solid #E5E0D8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 900, color: '#FF5C3A' }}>{s.step}</div>
                  <div style={{ fontSize: 26 }}>{s.emoji}</div>
                </div>
                <h4 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ WHO IT'S FOR ══════════════════ */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, marginBottom: 12 }}>Built for businesses like yours</h2>
          <p style={{ fontSize: 16, color: '#6B6B6B' }}>If you pay daily wages or manage a field team, WorkFlow is for you.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { emoji: '🏗️', title: 'Construction Sites', desc: 'Manage masons, helpers, electricians and contractors across multiple sites.' },
            { emoji: '🏭', title: 'Factories', desc: 'Track shifts, overtime and monthly wages for your shop-floor workers.' },
            { emoji: '🌾', title: 'Agriculture', desc: 'Log daily labour attendance and pay seasonal workers effortlessly.' },
            { emoji: '🏠', title: 'Real Estate', desc: 'Oversee contractors and daily-wage workers across your projects.' },
            { emoji: '🚚', title: 'Logistics', desc: 'Manage delivery staff, loading crew, and drivers — all in one place.' },
          ].map(c => (
            <div key={c.title} style={{ background: '#FAFAF8', borderRadius: 16, padding: '22px 18px', border: '1px solid #E5E0D8', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{c.emoji}</div>
              <h4 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{c.title}</h4>
              <p style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════ FAQ ══════════════════ */}
      <section id="faq" style={{ background: '#F7F4EF', borderTop: '1px solid #EDE9E2', padding: '88px 32px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 900, marginBottom: 12 }}>Frequently asked questions</h2>
          </div>
          {[
            { q: 'Is WorkFlow really free?', a: 'Yes. WorkFlow has a free plan that lets you manage up to 25 workers with full attendance and payroll features. No credit card needed to start.' },
            { q: 'Do I need to install anything?', a: 'No. WorkFlow is a web app — open it in any browser on your phone, tablet, or laptop. Nothing to install or update.' },
            { q: 'How is salary calculated?', a: 'WorkFlow multiplies your worker\'s daily wage by the number of present days. Half-days count as 0.5 days. Advances and penalties are subtracted automatically to give you the net pay.' },
            { q: 'Can I track overtime?', a: 'Yes. Each worker has an overtime rate (₹ per hour) that you can set. Overtime hours are added on top of the regular wage when calculating salary.' },
            { q: 'What payment methods are supported?', a: 'You can record payments made via Cash, UPI, Bank Transfer, or Cheque. WorkFlow keeps a full audit trail of every transaction.' },
            { q: 'Can I manage workers across multiple sites?', a: 'Yes. All workers are under your account. You can use notes and roles to organise workers by site or project.' },
          ].map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid #E5E0D8' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}
              >
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{faq.q}</span>
                <span style={{ fontSize: 20, color: '#FF5C3A', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)' }}>+</span>
              </button>
              {openFaq === i && (
                <p style={{ fontSize: 14, color: '#5A5A5A', lineHeight: 1.75, paddingBottom: 18, marginTop: -4 }}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════ CTA BANNER ══════════════════ */}
      <section style={{ padding: '80px 32px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', background: 'linear-gradient(135deg,#1A1A1A,#2D2D2D)', borderRadius: 28, padding: '64px 40px', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.14)' }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, color: '#fff', marginBottom: 14 }}>
            Ready to ditch the register?
          </h2>
          <p style={{ fontSize: 16, color: '#9E9E9E', marginBottom: 36, maxWidth: 400, margin: '0 auto 36px' }}>
            Thousands of business owners already manage their workers on WorkFlow. Join them today — it's free.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ padding: '15px 36px', borderRadius: 12, fontSize: 16, fontWeight: 700, color: '#1A1A1A', textDecoration: 'none', background: '#FFBB00' }}>
              Create Free Account
            </Link>
            <Link href="/login" style={{ padding: '15px 36px', borderRadius: 12, fontSize: 16, fontWeight: 600, color: '#fff', textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.15)' }}>
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer style={{ borderTop: '1px solid #F0EDE8', padding: '36px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: '#FF5C3A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800 }}>WorkFlow</span>
          </div>
          <p style={{ fontSize: 13, color: '#9E9E9E' }}>© {new Date().getFullYear()} WorkFlow · Attendance & Payroll for Indian Businesses</p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/login" style={{ fontSize: 13, color: '#6B6B6B', textDecoration: 'none' }}>Log In</Link>
            <Link href="/register" style={{ fontSize: 13, color: '#6B6B6B', textDecoration: 'none' }}>Sign Up</Link>
          </div>
        </div>
      </footer>

      {/* ══════════════════ RESPONSIVE STYLES ══════════════════ */}
      <style>{`
        @media (max-width: 700px) {
          .lp-nav-desktop { display: none !important; }
          .lp-nav-links   { display: none !important; }
          .lp-nav-mobile  { display: block !important; }
          .lp-hero-grid   { grid-template-columns: 1fr !important; padding-top: 40px !important; }
          .lp-hero-mock   { display: none !important; }
          .lp-feat-grid   { grid-template-columns: 1fr !important; }
          .lp-feat-reverse .lp-feat-order-1 { order: 1; }
          .lp-feat-reverse .lp-feat-order-2 { order: 2; }
        }
        @media (min-width: 701px) {
          .lp-nav-desktop { display: flex !important; }
          .lp-nav-mobile  { display: none  !important; }
          .lp-feat-reverse .lp-feat-order-1 { order: 2; }
          .lp-feat-reverse .lp-feat-order-2 { order: 1; }
        }
      `}</style>
    </div>
  );
}
