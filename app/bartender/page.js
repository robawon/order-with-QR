'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function BartenderDashboard() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      const { data: staff, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error || !staff) {
        setErr('No staff record found.');
        setLoading(false);
        return;
      }
      if (staff.role !== 'bartender' && staff.role !== 'cafe_admin' && staff.role !== 'super_admin') {
        setErr('Access denied: Staff only.');
        setLoading(false);
        return;
      }
      setMe(staff);
      setLoading(false);
    }
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="wrap"><div className="card">Loading Bartender Station...</div></div>;
  }

  if (err) {
    return (
      <div className="wrap-sm" style={{ marginTop: '10vh' }}>
        <div className="card">
          <div className="err">{err}</div>
          <button onClick={handleLogout}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20 }}>🍹 Bartender Station</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Logged in as {me.full_name} ({me.role})</p>
        </div>
        <button className="ghost" onClick={handleLogout}>Log Out</button>
      </div>
      <div className="card">
        <p>Live FIFO order queue is ready for Step 5 implementation.</p>
      </div>
    </div>
  );
}
