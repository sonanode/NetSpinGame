# XZENZY — เปิดใช้ Member Dashboard จริง

รันคำสั่ง SQL นี้ใน **Supabase → SQL Editor** (ครั้งเดียว):

1. `supabase/schema.sql` (ถ้ายังไม่รัน)
2. `supabase/schema-secure.sql`
3. **`supabase/schema-member.sql`** ← wallet, ledger, โอนเงิน, ซื้อเครดิต

## ฟีเจอร์ที่ใช้งานได้

| เมนู | การทำงาน |
|------|----------|
| Dashboard | สรุป wallet / credits / network / commission + ประวัติ |
| My Network | รายชื่อคนที่สมัครผ่านรหัสแนะนำ |
| Invite | คัดลอกรหัส XZ… และลิงก์ `?ref=` |
| Deposit | ฝาก USDT (≤500 เครดิตทันที, มากกว่านั้น pending) |
| Transfer Balance | โอน USDT P2P ด้วยรหัสสมาชิก |
| Transfer Credits | โอนเครดิตเกม P2P |
| Withdraw | ถอน USDT (หัก wallet, สถานะ pending) |
| Buy Credits | แลก USDT → เครดิต (1 USDT = 100 Cr), แนะนำได้ 5% |
| Play Game | ไป `game.html` |
| Leaderboard | อันดับเครดิต |
| Commission | โบนัสตรง + ประวัติ |
| Profile / KYC / Settings | ดูข้อมูล / ตั้งชื่อ / เสียง |

## รหัสแนะนำ

ลิงก์: `https://www.xzenzy.com/index.html?ref=XZ7118067D`

สมาชิกใหม่สมัครแล้วระบบผูก referrer อัตโนมัติ
