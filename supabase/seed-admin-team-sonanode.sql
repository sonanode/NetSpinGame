-- XZENZY — ตั้งแอดมินหลัก (รันใน Supabase SQL Editor หลัง schema-admin.sql)
-- ใช้กับ Sign in with Google หรือ email/password ของ team.sonanode@gmail.com
-- ต้องเคย Sign in with Google ที่ admin-login อย่างน้อย 1 ครั้งก่อน (สร้างแถวใน profiles)

-- sync email จาก auth.users (กรณี Google ยังไม่มี email ใน profiles)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('team.sonanode@gmail.com')
  and (p.email is null or trim(p.email) = '');

update public.profiles p
set is_admin = true,
    rank = 'admin',
    email = coalesce(nullif(trim(p.email), ''), u.email)
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('team.sonanode@gmail.com');

-- ตรวจผล (ต้องได้ 1 แถว is_admin = true)
select p.id, p.email, u.email as auth_email, p.is_admin, p.rank
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('team.sonanode@gmail.com');
