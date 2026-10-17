'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, pick } from '../../lib/supabase';

export default function Menu() {
  const { slug } = useParams();
  const [cafe, setCafe] = useState(null);
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [lang, setLang] = useState(null);
  const [missing, setMissing] = useState(false);

  const load = async () => {
    const { data: c } = await supabase.from('cafes').select('*').eq('slug', slug).maybeSingle();
    if (!c) return setMissing(true);
    setCafe(c);
    setLang((l) => l || localStorage.getItem('lang') || c.default_language);
    const q = (t) => supabase.from(t).select('*').eq('cafe_id', c.id).order('sort_order').order('created_at');
    const [a, b] = await Promise.all([q('categories'), q('items')]);
    setCats(a.data || []);
    setItems(b.data || []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('menu-' + slug);
    ['items', 'categories', 'cafes'].forEach((table) =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, load));
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [slug]);

  if (missing) return <div className="wrap">This menu was not found.</div>;
  if (!cafe || !lang) return <div className="wrap">Loading...</div>;

  const t = cafe.theme || {};
  const def = cafe.default_language;
  const size = { small: 14, medium: 16, large: 18 }[t.font_size] || 16;
  const radius = t.corners === 'square' ? 0 : 14;
  const grid = t.layout === 'grid';
  const setLanguage = (l) => { localStorage.setItem('lang', l); setLang(l); };

  return (
    <div style={{ background: t.background, color: t.text, minHeight: '100vh', fontSize: size }}>
      <div className="wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {cafe.logo_url && <img src={cafe.logo_url} alt="" style={{ height: 44, borderRadius: radius }} />}
            <h1 style={{ margin: 0, color: t.primary }}>{cafe.name}</h1>
          </div>
          <div>
            {cafe.languages.map((l) => (
              <button key={l} onClick={() => setLanguage(l)}
                style={{ marginLeft: 6, background: l === lang ? t.button : '#ddd', color: l === lang ? '#fff' : '#333', borderRadius: radius }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <p>{pick(cafe.description, lang, def)}</p>

        {cats.map((c) => (
          <section key={c.id}>
            <h2 style={{ color: t.primary }}>{pick(c.name, lang, def)}</h2>
            <div style={grid ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 } : {}}>
              {items.filter((i) => i.category_id === c.id).map((i) => (
                <div key={i.id} style={{ display: 'flex', gap: 12, padding: 12, marginBottom: grid ? 0 : 10,
                  border: '1px solid rgba(128,128,128,.25)', borderRadius: radius, flexDirection: grid ? 'column' : 'row' }}>
                  {i.image_url && <img src={i.image_url} alt=""
                    style={{ width: grid ? '100%' : (t.photo_size === 'small' ? 56 : 96), height: grid ? 140 : (t.photo_size === 'small' ? 56 : 96), objectFit: 'cover', borderRadius: radius }} />}
                  <div style={{ flex: 1 }}>
                    <b>{pick(i.name, lang, def)}</b>
                    <div style={{ opacity: .7, fontSize: '.9em' }}>{pick(i.description, lang, def)}</div>
                  </div>
                  <b style={{ color: t.primary, whiteSpace: 'nowrap' }}>{Number(i.price).toFixed(2)} {cafe.currency}</b>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
