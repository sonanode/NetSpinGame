# ตั้งค่า Supabase — สมาชิกต้องสมัครก่อนเล่น

เกมใช้ **2 หน้าเว็บ**:

| หน้า | ไฟล์ | ทำอะไร |
|------|------|--------|
| หน้าแรก (สมัคร / เข้าสู่ระบบ) | `index.html` | Register / Sign in |
| หน้าเกม (เฉพาะสมาชิก) | `game.html` | เล่นสล็อต 4×5 |

โฮสต์เว็บยังใช้ **GitHub Pages** — Supabase เก็บบัญชีและ balance บน cloud

---

## ขั้นที่ 1 — รัน SQL ใน Supabase

1. เปิด [Supabase Dashboard](https://supabase.com/dashboard) → โปรเจกต์ **NetSpinGame**
2. **SQL Editor** → New query
3. วางเนื้อหาจากไฟล์ `supabase/schema.sql` แล้วกด **Run**

---

## ขั้นที่ 2 — เปิด Email Login

1. **Authentication** → **Providers** → **Email** → เปิดใช้งาน
2. (แนะนำตอนทดสอบ) **Authentication** → **Sign In / Providers** → ปิด **Confirm email** ชั่วคราว เพื่อสมัครแล้วเล่นได้ทันที

---

## ขั้นที่ 3 — ตั้ง URL ของเว็บ

**Authentication** → **URL Configuration**

| ช่อง | ค่า |
|------|-----|
| Site URL | `https://sonanode.github.io/NetSpinGame/` |
| Redirect URLs | `https://sonanode.github.io/NetSpinGame/**` และ `http://localhost:3456/**` |

---

## ขั้นที่ 4 — ใส่ API Key ในโปรเจกต์

1. Supabase → **Project Settings** → **API**
2. คัดลอก **Project URL** และ **anon public** key
3. ในโฟลเดอร์ `web-mini-slot`:

```powershell
Copy-Item js\supabase-config.example.js js\supabase-config.js
```

4. แก้ `js/supabase-config.js`:

```js
export const SUPABASE_URL = 'https://tjaqcnaslxjuklaiivjs.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...';  // anon key ของคุณ
```

ไฟล์ `supabase-config.js` ไม่ถูก push ขึ้น GitHub (อยู่ใน `.gitignore`)

---

## ขั้นที่ 5 — ทดสอบบนเครื่อง

```powershell
cd web-mini-slot
npx --yes serve . -p 3456
```

1. เปิด `http://localhost:3456/` → สมัครสมาชิก
2. หลัง login จะไป `game.html` อัตโนมัติ
3. ปิดเบราว์เซอร์แล้ว login ใหม่ — balance ควรโหลดจาก cloud

---

## ขั้นที่ 6 — อัปโหลด GitHub

```powershell
git add .
git commit -m "Add member login and Supabase profiles"
git push origin master
```

หลัง push รอ 1–2 นาที แล้วเปิด:

- หน้าแรก: **https://sonanode.github.io/NetSpinGame/**
- เกม: **https://sonanode.github.io/NetSpinGame/game.html**

**สำคัญ:** บน GitHub Pages ต้องมี `js/supabase-config.js` บน repo ด้วย  
หรือใช้ GitHub Actions inject secrets (ขั้นสูง) — ตอนแรกอาจ commit ไฟล์ config ชั่วคราวเฉพาะ anon key (public) แล้วค่อยย้ายไป Actions ภายหลัง

---

## ผูก GitHub ใน Supabase (ไม่บังคับ)

Dashboard → **Integrations** → **GitHub** → เลือก `sonanode/NetSpinGame`  
ใช้สำหรับ Edge Functions / migration ไม่ใช่โฮสต์หน้าเกม
