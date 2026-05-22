# ติดตั้งโดเมนจริง — NetSpinGame (GitHub Pages)

คู่มือนี้ใช้กับ repo **sonanode/NetSpinGame** ที่ deploy บน GitHub Pages อยู่แล้ว  
หลังติดตั้งโดเมน ผู้เล่นเข้าเว็บด้วย `https://โดเมนคุณ.com` แทน `https://sonanode.github.io/NetSpinGame/`

---

## สิ่งที่ต้องมีก่อนเริ่ม

1. **โดเมนที่ซื้อแล้ว** (Namecheap, GoDaddy, Cloudflare, Porkbun ฯลฯ)  
2. เข้า **DNS ของโดเมน** ได้ (แก้ A / CNAME record)  
3. สิทธิ์ **Admin** repo https://github.com/sonanode/NetSpinGame  

> ยังไม่มีโดเมน → ซื้อก่อน (แนะนำใช้ **www** เป็นหลัก เช่น `www.netspingame.com` — ตั้งง่ายที่สุด)

---

## ขั้นที่ 1 — เลือกรูปแบบโดเมน

| แบบ | ตัวอย่าง | ความยาก |
|-----|---------|--------|
| **แนะนำ** | `www.yourdomain.com` | ง่าย — CNAME อย่างเดียว |
| Apex | `yourdomain.com` (ไม่มี www) | ต้อง A record 4 ค่า หรือ ALIAS |

ในคู่มือใช้ตัวอย่าง: **`www.yourdomain.com`**  
แทนที่ `yourdomain.com` ด้วยโดเมนจริงของคุณทุกที่

---

## ขั้นที่ 2 — สร้างไฟล์ CNAME ใน repo

1. คัดลอกไฟล์ตัวอย่าง:

```powershell
cd "d:\UnityHub\MK Slot Machine Kit • Modern Neon Casino Template\web-mini-slot"
copy CNAME.example CNAME
```

2. เปิด `CNAME` แก้เป็นชื่อโดเมนที่ต้องการ (บรรทัดเดียว ไม่มี `https://`):

```
www.yourdomain.com
```

3. Commit และ push:

```powershell
git add CNAME
git commit -m "Add custom domain CNAME"
git push origin master
```

---

## ขั้นที่ 3 — ตั้งค่า DNS ที่ผู้ขายโดเมน

### ถ้าใช้ `www.yourdomain.com` (แนะนำ)

| Type | Name / Host | Value / Target | TTL |
|------|-------------|----------------|-----|
| **CNAME** | `www` | `sonanode.github.io` | 300–3600 |

### ถ้าต้องการ `yourdomain.com` (ไม่มี www) ด้วย

เพิ่ม **A records** (4 รายการ):

| Type | Name | Value |
|------|------|-------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

และใน GitHub ใส่ apex ใน Custom domain ได้ (หรือ redirect www → apex ที่ registrar)

### Cloudflare (ถ้าใช้)

- Proxy เปิด (ส้ม) ได้ แต่ SSL ต้องเป็น **Full** หรือ **Full (strict)**  
- รอ DNS propagate 5–30 นาที (บางที่ถึง 24 ชม.)

---

## ขั้นที่ 4 — เปิด Custom domain บน GitHub

1. เปิด https://github.com/sonanode/NetSpinGame/settings/pages  
2. **Build and deployment** → Source: Deploy from branch → `master` → `/ (root)`  
3. **Custom domain** → พิมพ์ `www.yourdomain.com` → **Save**  
4. รอ GitHub ตรวจ DNS → ติ๊ก **Enforce HTTPS** เมื่อขึ้นสีเขียว  

ถ้า GitHub แจ้งว่า DNS ไม่ถูก → ตรวจ CNAME ใน repo กับ record ที่ registrar ให้ตรงกัน

---

## ขั้นที่ 5 — อัปเดต Supabase (บังคับ)

เปิดโปรเจกต์ **NetSpinGame** → **Authentication** → **URL Configuration**

| ช่อง | ค่าใหม่ (ตัวอย่าง) |
|------|-------------------|
| **Site URL** | `https://www.yourdomain.com/dashboard.html` |
| **Redirect URLs** | `https://www.yourdomain.com/dashboard.html` |
| | `https://www.yourdomain.com/` |
| | `https://www.yourdomain.com/index.html` |
| | (เก็บของเก่าไว้ชั่วคราวได้) `https://sonanode.github.io/NetSpinGame/dashboard.html` |

กด **Save**

---

## ขั้นที่ 6 — Google OAuth (ถ้าใช้ Login with Google)

**Google Cloud Console** → OAuth client → **Authorized redirect URIs** ไม่ต้องเปลี่ยน (ยังเป็น Supabase callback URL)

แต่ใน **Supabase** redirect ด้านบนต้องมีโดเมนใหม่แล้ว

**Authorized JavaScript origins** (ถ้ามีช่องนี้ใน Google):

- `https://www.yourdomain.com`

---

## ขั้นที่ 7 — ทดสอบ

1. เปิด `https://www.yourdomain.com/` → หน้า login  
2. ล็อกอิน → ต้องไป **`/dashboard.html`**  
3. กด Play Game → `/game.html`  
4. แถบที่อยู่ต้องเป็นโดเมนคุณ ไม่ใช่ `github.io`  

คำสั่งตรวจ DNS (PowerShell):

```powershell
Resolve-DnsName www.yourdomain.com -Type CNAME
```

ควรชี้ไป `sonanode.github.io`

---

## โครงสร้าง URL หลังใส่โดเมน

| หน้า | URL |
|------|-----|
| Login | `https://www.yourdomain.com/` |
| Dashboard | `https://www.yourdomain.com/dashboard.html` |
| Game | `https://www.yourdomain.com/game.html` |

> ไม่มี `/NetSpinGame/` ใน path อีกต่อไป — โค้ดใช้ path แบบ relative อยู่แล้ว จึงรองรับโดเมนตรง

---

## แก้ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|--------|--------|
| เว็บไม่ขึ้น / 404 | รอ DNS, ตรวจ CNAME ใน repo ตรงกับ Custom domain ใน GitHub |
| Certificate ไม่ขึ้น | ปิด proxy ชั่วคราว หรือใช้ Full SSL บน Cloudflare |
| ล็อกอินแล้วผิดหน้า | อัปเดต Supabase Site URL + Redirect URLs ให้เป็นโดเมนใหม่ |
| รูปเกมไม่ขึ้น | Hard refresh Ctrl+F5, ตรวจว่าเปิดผ่าน HTTPS |

---

## หลังโดเมนพร้อม — บอกทีม dev

ส่งข้อมูลนี้เพื่ออัปเดตเอกสาร/ลิงก์ในโปรเจกต์:

- โดเมนจริงที่ใช้ (เช่น `www.netspingame.com`)
- ใช้ apex (`netspingame.com`) หรือแค่ www

จากนั้นจะช่วยอัป `DEPLOY.md`, Supabase redirect และ push `CNAME` ให้ตรงโดเมนคุณได้
