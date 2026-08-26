'use client';

import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nextPath, setNextPath] = useState('/admin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const requestedPath = new URLSearchParams(window.location.search).get('next');
    if (requestedPath?.startsWith('/') && !requestedPath.startsWith('//')) setNextPath(requestedPath);
  }, []);

  const signIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to sign in.');
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

        <h1 style={{ margin: '0 0 8px', color: '#171a31', fontSize: 29, letterSpacing: '-0.5px' }}>Welcome back</h1>
        <p style={{ margin: '0 0 26px', color: '#686d7c', lineHeight: 1.55 }}>Sign in to create packages, manage deals, and review buyer activity.</p>

        <form onSubmit={signIn}>
          <label htmlFor="omd-username" style={{ display: 'block', marginBottom: 7, color: '#34384a', fontWeight: 650, fontSize: 14 }}>Team username</label>
          <input id="omd-username" type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required style={{ width: '100%', padding: '13px 14px', marginBottom: 18, border: '1px solid #d9dde6', borderRadius: 10, fontSize: 16, outlineColor: '#00b894' }} />

          <label htmlFor="omd-password" style={{ display: 'block', marginBottom: 7, color: '#34384a', fontWeight: 650, fontSize: 14 }}>Password</label>
          <input id="omd-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ width: '100%', padding: '13px 14px', border: '1px solid #d9dde6', borderRadius: 10, fontSize: 16, outlineColor: '#00b894' }} />

          {error && <div role="alert" style={{ marginTop: 16, padding: 12, borderRadius: 9, background: '#fff0f0', color: '#b42318', fontSize: 14 }}>{error}</div>}

          <button type="submit" disabled={submitting} style={{ width: '100%', marginTop: 23, padding: 14, border: 0, borderRadius: 10, background: submitting ? '#8cdacb' : '#00b894', color: 'white', fontWeight: 750, fontSize: 16, cursor: submitting ? 'default' : 'pointer' }}>
            {submitting ? 'Signing in...' : 'Enter OMD'}
          </button>
        </form>

        <p style={{ margin: '22px 0 0', paddingTop: 20, borderTop: '1px solid #eef0f4', textAlign: 'center', color: '#9599a6', fontSize: 12 }}>Buyer deal links remain public and do not require a login.</p>
      </section>
    </main>
  );
}
