'use client';
import { useEffect, useState } from 'react';
import { supabase, pick } from '../../lib/supabase';

export default function Admin() {
  const [me, setMe] = useState(null);
  const [cafes, setCafes] = useState([]);
  const [cafe, setCafe] = useState(null);
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return (location.href = '/login');
      const { data: s } = await supabase.from('staff').select('*').eq('user_id', session.user.id).single();
      if (!s) return setMsg('No staff record found for this account.');
      if (!s.active) return setMsg('Your staff account is deactivated.');
      if (s.role === 'bartender') return (location.href = '/bartender');
      setMe(s);

      // Fetch cafes
      const { data: cs, error: cafeErr } = await supabase.from('cafes').select('*').order('name');
      if (cafeErr) return setMsg(cafeErr.message);

      // Cafe admin gets their own cafe; super admin gets all cafes
      const list = s.role === 'super_admin' ? (cs || []) : (cs || []).filter((c) => c.id === s.cafe_id);
      setCafes(list);

      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('cafe') || urlParams.get('impersonate');
      const matched = list.find((c) => c.id === targetId);
      setCafe(matched || list[0] || null);
    })();
  }, []);

  const load = async () => {
    if (!cafe) return;
    const q = (t) => supabase.from(t).select('*').eq('cafe_id', cafe.id).order('sort_order').order('created_at');
    const [c, i] = await Promise.all([q('categories'), q('items')]);
    setCats(c.data || []);
    setItems(i.data || []);
  };
  useEffect(() => { load(); }, [cafe]);

  const run = async (p) => {
    const { error } = await p;
    setMsg(error ? error.message : '');
    await load();
  };

  const langs = cafe?.languages || ['en'];
  const texts = (fd, prefix) =>
    Object.fromEntries(langs.map((l) => [l, (fd.get(prefix + l) || '').trim()]).filter(([, v]) => v));

  async function addCat(e) {
    e.preventDefault();
    const name = texts(new FormData(e.target), 'n_');
    if (!Object.keys(name).length) return setMsg('Enter a category name.');
    await run(supabase.from('categories').insert({ cafe_id: cafe.id, name }));
    e.target.reset();
  }

  async function addItem(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = texts(fd, 'n_');
    if (!Object.keys(name).length || !fd.get('cat')) return setMsg('Choose a category and enter a name.');
    await run(supabase.from('items').insert({
      cafe_id: cafe.id,
      category_id: fd.get('cat'),
      name,
      description: texts(fd, 'd_'),
      price: Number(fd.get('price')),
    }));
    e.target.reset();
  }

  async function upload(item, file) {
    if (!file) return;
    const path = `${cafe.id}/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('cafe-assets').upload(path, file);
    if (error) return setMsg(error.message);
    const { data } = supabase.storage.from('cafe-assets').getPublicUrl(path);
    await run(supabase.from('items').update({ image_url: data.publicUrl }).eq('id', item.id));
  }

  const logout = async () => { await supabase.auth.signOut(); location.href = '/login'; };

  if (!me) return <div className="wrap">{msg || 'Loading...'}</div>;
  if (!cafe) return <div className="wrap">No cafe found. Create one first (see README).</div>;
  const def = cafe.default_language;

  return (
    <div className="wrap">
      {me.role === 'super_admin' && (
        <div style={{
          backgroundColor: '#451a03',
          color: '#fef3c7',
          padding: '12px 18px',
          borderRadius: 10,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 600,
          fontSize: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <span>👑 Viewing <b>{cafe.name}</b> as super admin</span>
          <a href="/super" style={{ color: '#ffffff', textDecoration: 'underline', fontSize: 13 }}>
            Return to Super Admin
          </a>
        </div>
      )}
      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <b>{cafe.name}</b> &middot; <a href={`/${cafe.slug}`} target="_blank">view menu</a>
          {me.role === 'super_admin' && cafes.length > 0 && (
            <select
              value={cafe.id}
              onChange={(e) => setCafe(cafes.find((c) => c.id === e.target.value))}
              style={{ marginLeft: 10, width: 'auto', display: 'inline-block', padding: '6px 12px', minHeight: 36, height: 36 }}
            >
              {cafes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button className="ghost" onClick={logout}>Log out</button>
      </div>
      {msg && <div className="err">{msg}</div>}

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: '#ffffff', borderRadius: 10, padding: 4,
        border: '1px solid #e6dfd5', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {[
          { label: '☕ Menu', href: '/admin', active: true },
          { label: '🪑 Tables', href: '/admin/tables' },
          { label: '👥 Staff', href: '/admin/staff' },
        ].map((tab) => (
          <a key={tab.href} href={tab.href} style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              padding: '10px 8px', textAlign: 'center', borderRadius: 8,
              fontWeight: tab.active ? 700 : 500, fontSize: 14,
              color: tab.active ? '#fff' : '#6b635b',
              background: tab.active ? '#8b5a2b' : 'transparent',
              transition: 'all 0.15s',
            }}>
              {tab.label}
            </div>
          </a>
        ))}
      </div>

      <div className="card">
        <h3>Add category</h3>
        <form onSubmit={addCat}>
          {langs.map((l) => <input key={l} name={'n_' + l} placeholder={`Name (${l})`} />)}
          <button type="submit">Add</button>
        </form>
      </div>

      <div className="card">
        <h3>Add item</h3>
        <form onSubmit={addItem}>
          <select name="cat" defaultValue="">
            <option value="" disabled>Category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{pick(c.name, def, def)}</option>)}
          </select>
          <input name="price" type="number" step="0.01" min="0" placeholder={`Price (${cafe.currency})`} required />
          <div>{langs.map((l) => <input key={l} name={'n_' + l} placeholder={`Name (${l})`} />)}</div>
          <div>{langs.map((l) => <input key={l} name={'d_' + l} placeholder={`Description (${l})`} style={{ width: 260 }} />)}</div>
          <button type="submit">Add item</button>
        </form>
      </div>

      {cats.map((c) => (
        <div className="card" key={c.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>{pick(c.name, def, def)}</h3>
            <span>
              <label>
                <input type="checkbox" checked={c.visible}
                  onChange={(e) => run(supabase.from('categories').update({ visible: e.target.checked }).eq('id', c.id))} /> visible
              </label>
              <button className="danger" onClick={() => confirm('Delete category?') && run(supabase.from('categories').delete().eq('id', c.id))}>Delete</button>
            </span>
          </div>
          {items.filter((i) => i.category_id === c.id).map((i) => (
            <div className="row" key={i.id}>
              {i.image_url ? <img src={i.image_url} alt="" /> : <div style={{ width: 48 }} />}
              <div style={{ flex: 1, minWidth: 140 }}>
                <b>{pick(i.name, def, def)}</b>
                <div style={{ fontSize: 13, color: '#666' }}>{pick(i.description, def, def)}</div>
              </div>
              <input type="number" step="0.01" defaultValue={i.price} style={{ width: 90 }}
                onBlur={(e) => Number(e.target.value) !== Number(i.price) && run(supabase.from('items').update({ price: Number(e.target.value) }).eq('id', i.id))} />
              <label>
                <input type="checkbox" checked={i.available}
                  onChange={(e) => run(supabase.from('items').update({ available: e.target.checked }).eq('id', i.id))} /> available
              </label>
              <input type="file" accept="image/*" onChange={(e) => upload(i, e.target.files[0])} style={{ width: 170 }} />
              <button className="danger" onClick={() => confirm('Delete item?') && run(supabase.from('items').delete().eq('id', i.id))}>Delete</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
