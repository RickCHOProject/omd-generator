'use client';

import { useState } from 'react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const savePassword = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to save your password.');
        return;
      }
      window.location.assign('/admin');
    } catch {
      setError('Unable to reach the login service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'radial-gradient(circle at top right, #164b4d 0, #171b33 38%, #101327 100%)' }}>
      <section style={{ width: '100%', maxWidth: 440, padding: '38px 36px', background: 'white', borderRadius: 22, boxShadow: '0 30px 80px rgba(0,0,0,0.34)' }}>
        <div style={{ color: '#171a31', fontSize: 21, fontWeight: 800 }}>Off Market Daily</div>
        <h1 style={{ margin: '24px 0 8px', color: '#171a31', fontSize: 29 }}>Choose your password</h1>
        <p style={{ margin: '0 0 26px', color: '#686d7c', lineHeight: 1.55 }}>This completes a new staff invitation or resets your existing password.</p>
        <form onSubmit={savePassword}>
          <label htmlFor="new-password" style={{ display: 'block', marginBottom: 7, color: '#34384a', fontWeight: 650, fontSize: 14 }}>New password</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required style={{ width: '100%', padding: '13px 14px', marginBottom: 18, border: '1px solid #d9dde6', borderRadius: 10, fontSize: 16, outlineColor: '#00b894' }} />
          <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: 7, color: '#34384a', fontWeight: 650, fontSize: 14 }}>Confirm password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required style={{ width: '100%', padding: '13px 14px', border: '1px solid #d9dde6', borderRadius: 10, fontSize: 16, outlineColor: '#00b894' }} />
          {error && <div role="alert" style={{ marginTop: 16, padding: 12, borderRadius: 9, background: '#fff0f0', color: '#b42318', fontSize: 14 }}>{error}</div>}
          <button type="submit" disabled={submitting} style={{ width: '100%', marginTop: 23, padding: 14, border: 0, borderRadius: 10, background: submitting ? '#8cdacb' : '#00b894', color: 'white', fontWeight: 750, fontSize: 16 }}>
            {submitting ? 'Saving...' : 'Save password and enter OMD'}
          </button>
        </form>
      </section>
    </main>
  );
}
