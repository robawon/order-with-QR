# Cafe Menu - Step 2

## Run it
1. Install Node.js 18+.
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in the Project URL and anon key
   (Supabase > Project Settings > API).
4. `npm run dev`, then open http://localhost:3000/login

## Create a cafe and its admin (SQL Editor, until the super admin panel exists)
1. Authentication > Users > Add user (the cafe admin's email, tick Auto Confirm User).
2. Run this with the real UUID:

    insert into cafes (slug, name, languages, default_language)
    values ('sunrise', 'Sunrise Cafe', '{en,am}', 'en');

    insert into staff (user_id, cafe_id, role, full_name)
    select 'PASTE-ADMIN-USER-UUID', id, 'cafe_admin', 'Cafe Admin'
    from cafes where slug = 'sunrise';

3. Log in at /login, add categories and items, then open /sunrise.
Do not use "admin" or "login" as a cafe slug.
