import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Pick a translated text: chosen language, then default language, then any available, or fallback
export const pick = (obj, lang, def = 'en') => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj[def] || Object.values(obj)[0] || '';
};
