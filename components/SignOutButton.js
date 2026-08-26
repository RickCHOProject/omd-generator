'use client';

import { useEffect, useState } from 'react';

export default function SignOutButton() {
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => {
        setDisplayName(session?.displayName || '');
        setRole(session?.role || '');
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      {displayName && <span style={{ color: '#cbd0dd', fontSize: 12, fontWeight: 650 }}>{displayName}{role === 'owner' ? ' · Owner' : ''}</span>}
      <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        style={{
          padding: '9px 14px',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 9,
          background: 'rgba(255,255,255,0.08)',
          color: 'white',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 650
        }}
      >
        Sign out
      </button>
      </form>
    </div>
  );
}
