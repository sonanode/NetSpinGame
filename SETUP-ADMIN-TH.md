# XZENZY — ตั้งค่าระบบแอดมิน (ภาษาไทย)

แอดมิน **เข้าแยกจากสมาชิก** — ไม่มีลิงก์ในแดชบอร์ดสมาชิก

| ระบบ | หน้า login | หลัง login |
|------|------------|------------|
| สมาชิก | `index.html` | `dashboard.html` |
| แอดมิน | **`admin-login.html`** | `admin.html` |

ใช้ Supabase Auth + `profiles.is_admin` (บัญชี staff ต้องถูกตั้ง `is_admin = true`)

## 1. รัน SQL ใน Supabase

ลำดับที่แนะนำ:

1. `supabase/schema.sql`
2. `supabase/schema-secure.sql`
3. `supabase/schema-member.sql`
4. **`supabase/schema-admin.sql`** ← ใหม่

## 2. ตั้งแอดมินคนแรก

ใน **SQL Editor** (แทนที่อีเมลด้วยอีเมลของคุณ):

```sql
update public.profiles
set is_admin = true, rank = 'admin'
where email = 'your-email@gmail.com';
```

## 3. เปิดใช้งาน

| ระบบ | URL |
|------|-----|
| สมาชิก login | `https://www.xzenzy.com/` หรือ `index.html` |
| **แอดมิน login** | **`https://www.xzenzy.com/admin-login.html`** |
| แอดมินหลัง login | `admin.html#overview` |

ใน Supabase → **Authentication → URL Configuration** เพิ่ม Redirect URL:

- `https://www.xzenzy.com/admin.html`
- `https://www.xzenzy.com/admin-login.html` (ถ้าใช้ OAuth จากหน้า login แอดมิน)

## 4. ฟีเจอร์แอดมิน

| แผง | ทำอะไร |
|-----|--------|
| **Overview** | จำนวนสมาชิก, pending, ยอด USDT/Credits รวม |
| **Members** | ค้นหาสมาชิก, ปรับ wallet/credits |
| **Pending** | อนุมัติ/ปฏิเสธ deposit >500 USDT และ withdrawal |
| **Ledger** | ดูธุรกรรมล่าสุดทั้งระบบ |
| **Staff** | ให้/ถอนสิทธิ์ admin, ตั้ง rank |

## 5. ความสัมพันธ์กับระบบสมาชิก

- ใช้ตาราง `profiles`, `member_ledger` เดียวกัน
- สมาชิกฝาก/ถอนผ่าน RPC เดิม → รายการ **pending** ไปที่แอดมินอนุมัติ
- การปรับยอดแอดมินบันทึกเป็น `type = admin_adjust` ใน ledger
- เกมและ credits ยังอยู่ที่ `profiles.balance` เหมือนเดิม

## 6. ความปลอดภัย

- ทุก RPC ตรวจ `is_admin_user()` ฝั่งเซิร์ฟเวอร์
- สมาชิกทั่วไปอ่าน ledger ได้เฉพาะของตัวเอง (RLS เดิม)
- อย่าแชร์บัญชี admin กับสมาชิกทั่วไป
