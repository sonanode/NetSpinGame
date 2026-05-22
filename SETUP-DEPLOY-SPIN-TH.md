# แก้ “เกมไม่หมุน” / Edge Function (ทางเลือก)

> **ตอนนี้เกมใช้โหมดเดิมแล้ว** — หมุนในเบราว์เซอร์ได้เลย **ไม่ต้องรัน PowerShell**  
> ไฟล์: `js/local-spin.js` + `js/engine.js`

เอกสารด้านล่างใช้เมื่อต้องการย้าย logic ไปเซิร์ฟเวอร์ (ป้องกันโกงขั้นสูง) ในอนาคต

---

## โหมดปัจจุบัน (ง่าย)

1. รัน SQL ครั้งเดียว: `supabase/schema-client-update.sql` (ให้บันทึก balance หลังหมุน)
2. เปิดเกม → กด SPIN

---

## โหมดเซิร์ฟเวอร์ (เดิม — ไม่บังคับ)

เกมเรียก **Supabase Edge Function ชื่อ `spin`**  
ถ้ายัง **ไม่ deploy** จะหมุนไม่ได้ (โหมดเก่าที่ย้ายไปแล้ว)

---

## ก่อน deploy — รัน SQL (ครั้งเดียว)

Supabase → **SQL Editor** → รันตามลำดับ:

1. `supabase/schema.sql` (ถ้ายังไม่เคย)
2. `supabase/schema-secure.sql`
3. `supabase/balance-economy.sql` (ถ้าต้องการแก้ jackpot / 40 ไลน์)

---

## วิธี deploy (Windows PowerShell)

เปิด PowerShell ในโฟลเดอร์ `web-mini-slot`:

```powershell
cd "d:\UnityHub\MK Slot Machine Kit • Modern Neon Casino Template\web-mini-slot"
.\deploy-functions.ps1
```

หรือทำมือ:

```powershell
cd "d:\UnityHub\MK Slot Machine Kit • Modern Neon Casino Template\web-mini-slot"

# 1) ล็อกอิน (เปิดเบราว์เซอร์ให้ยืนยัน)
npx --yes supabase login

# 2) ผูกโปรเจกต์
npx --yes supabase link --project-ref tjaqcnaslxjuklaiivjs

# 3) อัปโหลดฟังก์ชัน
npx --yes supabase functions deploy spin
npx --yes supabase functions deploy update-settings
```

> ถ้า error `could not determine executable` — ใช้ `npx --yes supabase` แบบด้านบน (มี `--yes`)

รอจนเห็น **Deployed** สำเร็จทั้ง 2 ตัว

---

## ตรวจใน Supabase Dashboard

1. เปิด https://supabase.com/dashboard/project/tjaqcnaslxjuklaiivjs/functions  
2. ต้องมี **`spin`** และ **`update-settings`** สถานะ active  
3. กด **spin** → Logs — ลองหมุนในเกม ควรมี request เข้า

---

## ทดสอบเกม

1. เปิด https://www.xzenzy.com/game.html  
2. ล็อกอิน  
3. กด **SPIN** — รีลต้องหมุน  

---

## ยัง error อยู่?

| อาการ | แก้ |
|--------|-----|
| ยังขึ้น Edge Function | deploy ไม่สำเร็จ — รัน `deploy-functions.ps1` อีกครั้ง |
| Profile not found | รัน `schema.sql` + สมัครสมาชิกใหม่ |
| 401 / Invalid session | ล็อกเอาท์ → ล็อกอินใหม่ |
| Insufficient balance | ปกติ — balance หมด |

---

## ทำไมต้อง deploy?

โค้ดคำนวณรางวัลอยู่ที่ `supabase/functions/` ไม่ได้อยู่ในเว็บ  
เพื่อไม่ให้แก้ชนะรางวัลผ่าน F12 — ต้องมีเซิร์ฟเวอร์ `spin` บน Supabase
