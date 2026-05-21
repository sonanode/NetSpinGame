# Google Login (Supabase)

หน้า `index.html` มีปุ่ม **Continue with Google**  
ต้องเปิด provider ใน Supabase และสร้าง OAuth client ใน Google Cloud

---

## ขั้น A — Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com/) → **Clients** → **Create client**
2. Type: **Web application**
3. **Authorized redirect URIs** (จาก Supabase หน้า Google):

   `https://tjaqcnaslxjuklaiivjs.supabase.co/auth/v1/callback`

4. Copy **Client ID** + **Client Secret**

---

## ขั้น B — Supabase

1. **Authentication** → **Sign In / Providers** → **Google** → Enable
2. วาง Client ID + Secret → **Save**
3. **URL Configuration**: Site URL `https://sonanode.github.io/NetSpinGame/`  
   Redirect `https://sonanode.github.io/NetSpinGame/**`

---

## ทดสอบ

เปิด https://sonanode.github.io/NetSpinGame/ → **Continue with Google** → `game.html`
