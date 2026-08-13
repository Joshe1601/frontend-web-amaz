'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!loading && user && role === 'admin') {
      router.replace('/dashboard');
    }
  }, [user, role, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Step 1: Firebase Auth
    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      console.error('[Login] Auth error:', code, err);
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Correo o contraseña incorrectos.');
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde.');
      } else if (code === 'auth/network-request-failed') {
        setError('Sin conexión. Verifica tu internet.');
      } else {
        setError(`Error de autenticación (${code || 'desconocido'}). Revisa la consola.`);
      }
      setSubmitting(false);
      return;
    }

    // Step 2: Check role in Firestore
    try {
      const snap = await getDoc(doc(db, 'users', credential.user.uid));
      const userRole = snap.data()?.role;
      if (!snap.exists()) {
        await auth.signOut();
        setError('Usuario no encontrado en el sistema. Contacta al administrador.');
        return;
      }
      if (userRole !== 'admin') {
        await auth.signOut();
        setError(`Esta cuenta tiene rol "${userRole ?? 'sin rol'}", no "admin". Sin acceso al panel.`);
        return;
      }
      router.replace('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      console.error('[Login] Firestore error:', code, err);
      await auth.signOut();
      if (code === 'permission-denied') {
        setError('Sin permisos para leer Firestore. Revisa las Security Rules.');
      } else {
        setError(`Error al verificar rol (${code || 'desconocido'}). Revisa la consola.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="login-bg min-h-screen flex items-center justify-center">
        <SpinnerIcon size={32} />
      </div>
    );
  }

  return (
    <div className="login-bg min-h-screen flex flex-col items-center justify-center px-5">
      <div
        className="animate-scale-in w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: '#1a2420',
          border: '1px solid #2a3830',
          boxShadow: '0 32px 64px -16px rgba(0,0,0,.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex flex-col items-center pt-10 pb-8 px-8"
          style={{ borderBottom: '1px solid #232b2c' }}
        >
          <div className="mb-3 relative w-24 h-24">
            <Image
              src="/logo-main-amaz.png"
              alt="AMAZ Coffee"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1
            className="font-display"
            style={{ color: '#F5EDD8', fontSize: 24, fontWeight: 700 }}
          >
            Panel Admin
          </h1>
          <p style={{ color: '#8a9a92', fontSize: 14, marginTop: 4 }}>
            Acceso exclusivo para administradores
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: 13, fontWeight: 600, color: '#9fb0a8' }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@amazcoffee.com"
              autoComplete="email"
              style={{
                background: '#111a16',
                border: '1.5px solid #2c3536',
                borderRadius: 12,
                padding: '13px 16px',
                color: '#F5EDD8',
                fontSize: 15,
                outline: 'none',
                width: '100%',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#C9A24B')}
              onBlur={(e) => (e.target.style.borderColor = '#2c3536')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label style={{ fontSize: 13, fontWeight: 600, color: '#9fb0a8' }}>
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: '#111a16',
                  border: '1.5px solid #2c3536',
                  borderRadius: 12,
                  padding: '13px 48px 13px 16px',
                  color: '#F5EDD8',
                  fontSize: 15,
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#C9A24B')}
                onBlur={(e) => (e.target.style.borderColor = '#2c3536')}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8a9a92',
                  padding: 4,
                }}
              >
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="animate-fade-in"
              style={{
                background: 'rgba(255,80,80,.1)',
                border: '1px solid rgba(255,80,80,.25)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#ff9090',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 4,
              minHeight: 52,
              background: submitting ? '#8a6e2e' : '#C9A24B',
              color: '#14271E',
              borderRadius: 13,
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {submitting ? (
              <>
                <SpinnerIcon size={18} />
                Ingresando…
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </div>

      <p style={{ color: '#4a5e52', fontSize: 12, marginTop: 24 }}>
        AMAZ Coffee · Solo personal autorizado
      </p>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SpinnerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 0.7s linear infinite' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
