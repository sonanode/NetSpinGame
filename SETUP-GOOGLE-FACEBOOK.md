# Google + Facebook Login (Supabase)

หน้า `index.html` มีปุ่ม **Continue with Google** และ **Continue with Facebook** แล้ว  
ต้องเปิด provider ใน Supabase และสร้าง App ที่ Google / Facebook ก่อนปุ่มจะใช้ได้

---

## Auth Providers คืออะไร?

**วิธีที่สมาชิกใช้เข้าระบบ** เช่น:

| Provider | ความหมาย |
|----------|-----------|
| **Email** | สมัครด้วยอีเมล + รหัสผ่าน (เปิดแล้ว) |
| **Google** | กดปุ่ม → login ด้วยบัญชี Google |
| **Facebook** | กดปุ่ม → login ด้วยบัญชี Facebook |

ใน Supabase: **Authentication → Sign In / Providers → Auth Providers**

---

## ขั้น A — เปิด Google ใน Supabase

1. กดแถว **Google** → เปิด **Enable**
2. จะมี **Callback URL** ให้ copy (รูปแบบประมาณ):
   `https://tjaqcnaslxjuklaiivjs.supabase.co/auth/v1/callback`
3. ไป [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials**
4. **Create OAuth client ID** → Web application
5. **Authorized redirect URIs** → วาง Callback URL จากข้อ 2
6. Copy **Client ID** + **Client Secret** → วางใน Supabase หน้า Google → **Save**

---

## ขั้น B — เปิด Facebook ใน Supabase

1. ไป [developers.facebook.com](https://developers.facebook.com/) → สร้าง App (ประเภท Consumer)
2. เพิ่ม **Facebook Login**
3. **Valid OAuth Redirect URIs** → วาง Callback URL เดียวกับ Google (จาก Supabase)
4. App → **Settings → Basic** → copy **App ID** และ **App Secret**
5. ใน Supabase กด **Facebook** → Enable → วาง App ID / Secret → **Save**

---

## ขั้น C — URL Configuration (สำคัญ)

**Authentication → URL Configuration**

| ช่อง | ค่า |
|------|-----|
| Site URL | `https://sonanode.github.io/NetSpinGame/` |
| Redirect URLs | `https://sonanode.github.io/NetSpinGame/**` |

---

## หลังตั้งเสร็จ

ผู้เล่นกด Google/Facebook → สมัครหรือ login อัตโนมัติ → กลับมา `game.html`  
ตาราง `profiles` สร้าง balance 25,000 ให้เหมือน Email (trigger เดิม)

---

## ลำดับแนะนำ

1. ทำ **ขั้น 3** (URL Configuration) จาก SETUP-SUPABASE.md ก่อน  
2. ใส่ **anon API key** ใน `js/supabase-config.js`  
3. ค่อยเปิด **Google** แล้ว **Facebook** ตามไฟล์นี้  
