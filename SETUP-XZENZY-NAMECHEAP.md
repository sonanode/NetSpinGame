# xzenzy.com → NetSpinGame (Namecheap + GitHub Pages)

โดเมน: **xzenzy.com**  
เว็บเกม/สมาชิก: repo **sonanode/NetSpinGame**

---

## ขั้นที่ 1 — DNS บน Namecheap

1. เปิด **Domain List** → คลิก **Manage** ที่ `xzenzy.com`
2. แท็บ **Advanced DNS** (ไม่ใช่แท็บ Domain ในภาพ)
3. **Host Records** → Add New Record:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| **CNAME** | `www` | `sonanode.github.io.` | Automatic |

> ใส่จุดท้าย `sonanode.github.io.` หรือไม่ใส่ก็ได้ (Namecheap มักเติมให้)

4. **บังคับสำหรับ HTTPS บน GitHub** — เพิ่ม A record ที่โดเมนราก `@` (แก้ข้อความ `xzenzy.com is improperly configured`):

| Type | Host | Value |
|------|------|-------|
| **A** | `@` | `185.199.108.153` |
| **A** | `@` | `185.199.109.153` |
| **A** | `@` | `185.199.110.153` |
| **A** | `@` | `185.199.111.153` |

> ลบ A record เก่าของ `@` ที่ชี้ที่อื่น (เช่น parking) ก่อนเพิ่ม 4 รายการนี้

5. (ทางเลือก) แท็บ **Domain** → **Redirect Domain**: `xzenzy.com` → `https://www.xzenzy.com` (301)  
   — ใช้คู่กับ A record ด้านบน ไม่ใช่แทน A record

6. ลบ CNAME/A เก่าที่ขัดกับ GitHub (ถ้ามี parking page)

รอ DNS 5–30 นาที

---

## ขั้นที่ 2 — GitHub Pages

1. https://github.com/sonanode/NetSpinGame/settings/pages
2. **Custom domain:** `www.xzenzy.com` → Save
3. รอตรวจ DNS ผ่าน → เปิด **Enforce HTTPS**

ไฟล์ `CNAME` ใน repo ต้องมีบรรทัดเดียว: `www.xzenzy.com`

---

## ขั้นที่ 3 — Supabase (NetSpinGame)

**Authentication → URL Configuration**

| ช่อง | ค่า |
|------|-----|
| Site URL | `https://www.xzenzy.com/dashboard.html` |
| Redirect URLs | `https://www.xzenzy.com/dashboard.html` |
| | `https://www.xzenzy.com/` |
| | `https://www.xzenzy.com/index.html` |
| | `https://sonanode.github.io/NetSpinGame/dashboard.html` *(สำรอง)* |

Save

---

## ขั้นที่ 4 — ทดสอบ

| หน้า | URL |
|------|-----|
| Login | https://www.xzenzy.com/ |
| Dashboard | https://www.xzenzy.com/dashboard.html |
| Game | https://www.xzenzy.com/game.html |

PowerShell:

```powershell
Resolve-DnsName www.xzenzy.com -Type CNAME
```

---

## สถานะ repo

- `CNAME` = `www.xzenzy.com` (commit แล้วหลัง push)
- โค้ดใช้ path แบบ relative — รองรับโดเมนตรงโดยไม่ต้องแก้ `/NetSpinGame/`
