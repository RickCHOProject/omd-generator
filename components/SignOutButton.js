'use client';

export default function SignOutButton() {
  return (
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
  );
}
