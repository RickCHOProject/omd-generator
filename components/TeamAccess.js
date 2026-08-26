'use client';

import { useEffect, useState } from 'react';

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : 'Not yet';

export default function TeamAccess() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/team', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load team access.');
      setMembers(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const inviteMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name, email })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send the invitation.');
      setMembers((current) => current.some((member) => member.id === result.id)
        ? current.map((member) => member.id === result.id ? result : member)
        : [...current, result]);
      setName('');
      setEmail('');
      setMessage(result.inviteSent
        ? `Invitation sent to ${result.email}.`
        : `${result.email} already had a Supabase account. OMD access is now approved; they can sign in or use Forgot Password.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const setMemberActive = async (member, active) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, active })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update access.');
      setMembers((current) => current.map((item) => item.id === result.id ? result : item));
      setMessage(`${result.displayName} ${active ? 'can now access OMD' : 'no longer has OMD access'}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 22 }}>
        <form onSubmit={inviteMember} style={{ padding: 20, border: '1px solid #e7eaf0', borderRadius: 12, background: '#fbfcfd' }}>
          <h2 style={{ margin: 0, color: '#171a31', fontSize: 18 }}>Invite a staff member</h2>
          <p style={{ margin: '7px 0 18px', color: '#747989', fontSize: 13, lineHeight: 1.5 }}>They receive an email to create their own password. No password is shared with you.</p>
          <label htmlFor="staff-name" style={{ display: 'block', marginBottom: 6, color: '#45495a', fontSize: 13, fontWeight: 700 }}>Name</label>
          <input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} required style={{ width: '100%', boxSizing: 'border-box', padding: 11, marginBottom: 14, border: '1px solid #dfe3e9', borderRadius: 8, fontSize: 14 }} />
          <label htmlFor="staff-email" style={{ display: 'block', marginBottom: 6, color: '#45495a', fontSize: 13, fontWeight: 700 }}>Work email</label>
          <input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required style={{ width: '100%', boxSizing: 'border-box', padding: 11, border: '1px solid #dfe3e9', borderRadius: 8, fontSize: 14 }} />
          <button type="submit" disabled={saving} style={{ width: '100%', marginTop: 16, padding: 11, border: 0, borderRadius: 8, background: '#00b894', color: 'white', cursor: 'pointer', fontWeight: 750 }}>
            {saving ? 'Working...' : 'Send invitation'}
          </button>
          {message && <div role="status" style={{ marginTop: 14, padding: 11, borderRadius: 8, background: '#eaf9f5', color: '#08745e', fontSize: 13 }}>{message}</div>}
          {error && <div role="alert" style={{ marginTop: 14, padding: 11, borderRadius: 8, background: '#fff0f0', color: '#b42318', fontSize: 13 }}>{error}</div>}
        </form>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, color: '#171a31', fontSize: 18 }}>People with OMD access</h2>
              <p style={{ margin: '5px 0 0', color: '#858a98', fontSize: 12 }}>Only these approved accounts can reach the generator and admin.</p>
            </div>
            <button type="button" onClick={loadMembers} style={{ padding: '8px 11px', border: '1px solid #dfe3e9', borderRadius: 8, background: 'white', color: '#555a6a', cursor: 'pointer', fontWeight: 650 }}>Refresh</button>
          </div>
          {loading ? <div style={{ padding: 30, color: '#858a98' }}>Loading team...</div> : members.map((member) => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: 15, marginBottom: 10, border: '1px solid #e7eaf0', borderRadius: 11, background: 'white' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ color: '#171a31' }}>{member.displayName}</strong>
                  <span style={{ padding: '3px 7px', borderRadius: 999, background: member.role === 'owner' ? '#171a31' : member.active ? '#eaf9f5' : '#f0f1f5', color: member.role === 'owner' ? 'white' : member.active ? '#008f73' : '#747989', fontSize: 10, fontWeight: 800 }}>{member.role === 'owner' ? 'OWNER' : member.active ? 'ACTIVE' : 'OFF'}</span>
                </div>
                <div style={{ marginTop: 3, color: '#717686', fontSize: 13 }}>{member.email}</div>
                <div style={{ marginTop: 5, color: '#999daa', fontSize: 11 }}>Last sign-in: {formatDate(member.lastSignInAt)}</div>
              </div>
              {member.role !== 'owner' && (
                <button type="button" disabled={saving} onClick={() => setMemberActive(member, !member.active)} style={{ flexShrink: 0, padding: '8px 11px', border: `1px solid ${member.active ? '#f0caca' : '#b9eee2'}`, borderRadius: 8, background: member.active ? '#fff5f5' : '#eaf9f5', color: member.active ? '#b42318' : '#008f73', cursor: 'pointer', fontWeight: 700 }}>
                  {member.active ? 'Remove access' : 'Restore access'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
