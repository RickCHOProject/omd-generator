'use client';

import { useEffect, useState } from 'react';
import { safeNextPath } from '../../lib/authEmailFlow.mjs';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nextPath, setNextPath] = useState('/admin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    const requestedPath = new URLSearchParams(window.location.search).get('next');
    setNextPath(safeNextPath(requestedPath));
    const urlError = new URLSearchParams(window.location.search).get('error');
    if (urlError) setError(urlError);
  }, []);

  const signIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(resetMode ? '/api/auth/reset' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to sign in.');
        return;
      }
      if (resetMode) {
        setNotice(result.message);
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setError('Unable to reach the login service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'radial-gradient(circle at top right, #164b4d 0, #171b33 38%, #101327 100%)' }}>
      <section style={{ width: '100%', maxWidth: 440, padding: '38px 36px', background: 'white', borderRadius: 22, boxShadow: '0 30px 80px rgba(0,0,0,0.34)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 30 }}>
          <div style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: 13, background: '#00b894', color: 'white' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#171a31', fontSize: 21 }}>Off Market Daily</div>
            <div style={{ color: '#7b8090', fontSize: 13 }}>Internal deal operations</div>
          </div>
        </div>

        <h1 style={{ margin: '0 0 8px', color: '#171a31', fontSize: 29, letterSpacing: '-0.5px' }}>{resetMode ? 'Reset your password' : 'Welcome back'}</h1>
        <p style={{ margin: '0 0 26px', color: '#686d7c', lineHeight: 1.55 }}>{resetMode ? 'Enter your approved OMD email and we’ll send a secure reset link.' : 'Sign in to create packages, manage deals, and review buyer activity.'}</p>

        <form onSubmit={signIn}>
          <label htmlFor="omd-email" style={{ display: 'block', marginBottom: 7, color: '#34384a', fontWeight: 650, fontSize: 14 }}>Email address</label>
          <input id="omd-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required style={{ width: '100%', padding: '13px 14px', marginBottom: 18, border: '1px solid #d9dde6', borderRadius: 10, fontSize: 16, outlineColor: '#00b894' }} />

          {!resetMode && (
            <>
              <label htmlFor="omd-password" style={{ display: 'block', marginBottom: 7, color: '#34384a', fontWeight: 650, fontSize: 14 }}>Password</label>
              <input id="omd-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ width: '100%', padding: '13px 14px', border: '1px solid #d9dde6', borderRadius: 10, fontSize: 16, outlineColor: '#00b894' }} />
            </>
          )}

          {error && <div role="alert" style={{ marginTop: 16, padding: 12, borderRadius: 9, background: '#fff0f0', color: '#b42318', fontSize: 14 }}>{error}</div>}
          {notice && <div role="status" style={{ marginTop: 16, padding: 12, borderRadius: 9, background: '#eaf9f5', color: '#08745e', fontSize: 14 }}>{notice}</div>}

          <button type="submit" disabled={submitting} style={{ width: '100%', marginTop: 23, padding: 14, border: 0, borderRadius: 10, background: submitting ? '#8cdacb' : '#00b894', color: 'white', fontWeight: 750, fontSize: 16, cursor: submitting ? 'default' : 'pointer' }}>
            {submitting ? (resetMode ? 'Sending...' : 'Signing in...') : (resetMode ? 'Send reset link' : 'Enter OMD')}
          </button>
        </form>

        <button type="button" onClick={() => { setResetMode(!resetMode); setError(''); setNotice(''); }} style={{ width: '100%', marginTop: 14, border: 0, background: 'transparent', color: '#08745e', cursor: 'pointer', fontWeight: 650, fontSize: 13 }}>
          {resetMode ? 'Back to sign in' : 'Forgot your password?'}
        </button>

        <p style={{ margin: '22px 0 0', paddingTop: 20, borderTop: '1px solid #eef0f4', textAlign: 'center', color: '#9599a6', fontSize: 12 }}>Buyer deal links remain public and do not require a login.</p>
      </section>
    </main>
  );
}
