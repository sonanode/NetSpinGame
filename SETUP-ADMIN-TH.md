# XZENZY — ตั้งค่าระบบแอดมิน (ภาษาไทย)

ระบบแอดมินใช้ **บัญชีสมาชิกเดียวกัน** (Supabase Auth + `profiles`) แต่มีคอลัมน์ `is_admin` และหน้า `admin.html`

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

| หน้า | URL |
|------|-----|
| สมาชิก | `dashboard.html#deposit` (แต่ละเมนูมีลิงก์ `#ชื่อแผง`) |
| แอดมิน | `admin.html` |

ผู้ที่ `is_admin = true` จะเห็นเมนู **Admin** ในแดชบอร์ดสมาชิก

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
