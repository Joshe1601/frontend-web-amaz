'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { PeriodProvider, usePeriod, toInputDate, Period } from '@/lib/period-context';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <GridIcon /> },
  { href: '/admin/ventas', label: 'Ventas', icon: <ChartIcon /> },
  { href: '/admin/ingredientes', label: 'Inventario', icon: <BoxIcon /> },
  { href: '/admin/productos', label: 'Productos', icon: <CoffeeIcon /> },
  { href: '/admin/reportes', label: 'Reportes', icon: <DocIcon /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PeriodProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </PeriodProvider>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, role, loading, signOut } = useAuth();
  const { period, setPeriod, selectedDate, setSelectedDate } = usePeriod();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      router.replace('/admin/login');
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== 'admin') {
    return (
      <div
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid var(--border)',
              borderTopColor: 'var(--green-dark)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Verificando acceso…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 24px',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            gap: 32,
          }}
        >
          {/* Logo */}
          <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ position: 'relative', width: 40, height: 40 }}>
              <Image src="/logo-main-amaz.png" alt="AMAZ Coffee" fill className="object-contain" priority />
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div
                className="font-display"
                style={{ color: 'var(--green-dark)', fontSize: 15, fontWeight: 700 }}
              >
                AMAZ
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 500, letterSpacing: 2 }}>
                COFFEE
              </div>
            </div>
          </Link>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#fff' : 'var(--text-sub)',
                    background: active ? 'var(--green-dark)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'background .15s, color .15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = '#f0ece5';
                      (e.currentTarget as HTMLElement).style.color = 'var(--green-dark)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-sub)';
                    }
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--green-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                <UserIcon />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Administrador
              </span>
              <ChevronIcon open={menuOpen} />
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  minWidth: 180,
                  boxShadow: '0 8px 24px rgba(0,0,0,.1)',
                  overflow: 'hidden',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Sesión activa como</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={async () => { setMenuOpen(false); await signOut(); router.replace('/admin/login'); }}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 14,
                    color: '#B91C1C',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <LogoutIcon />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Period filter bar */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 68,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-sub)', fontWeight: 500 }}>
            Filtrar por período:
          </span>
          <div
            style={{
              display: 'flex',
              background: '#f5f0e8',
              border: '1px solid var(--border)',
              borderRadius: 9,
              overflow: 'hidden',
            }}
          >
            {(['dia', 'semana', 'mes'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: period === p ? 'var(--green-dark)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-sub)',
                  transition: 'background .15s, color .15s',
                }}
              >
                {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f5f0e8',
              border: '1px solid var(--border)',
              borderRadius: 9,
              padding: '7px 14px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <input
              type="date"
              value={toInputDate(selectedDate)}
              onChange={(e) => {
                const d = new Date(e.target.value + 'T12:00:00');
                if (!isNaN(d.getTime())) setSelectedDate(d);
              }}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>

      {/* Page content */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--border)', background: '#fff', marginTop: 48 }}>
        AMAZ COFFEE © 2025 — Todos los derechos reservados.
      </footer>
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function CoffeeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', color: 'var(--text-muted)' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
