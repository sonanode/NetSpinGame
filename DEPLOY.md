# Deploy — NetSpinGame

## GitHub Pages (live)

**https://sonanode.github.io/NetSpinGame/**

Repo: https://github.com/sonanode/NetSpinGame

### Move to `NetSpinGame/NetSpinGame` (ใช้ Personal Access Token)

บัญชี `sonanode` เป็นสมาชิก org แต่ **ยังไม่มีสิทธิ์ Admin** จึงสร้าง repo ใน org โดยตรงไม่ได้ — ต้องใช้ **PAT ของ Owner/Admin** หรือสร้าง repo บนเว็บก่อน

#### ขั้นตอน A — สร้าง repo บน GitHub (แนะนำ)

1. Login บัญชีที่เป็น **Owner** ของ org `NetSpinGame`
2. เปิด: https://github.com/organizations/NetSpinGame/repositories/new  
   - Name: `NetSpinGame`  
   - Public  
   - **ไม่ต้อง** add README (repo ว่าง)
3. ใน PowerShell ที่โฟลเดอร์ `web-mini-slot`:

```powershell
$env:GITHUB_PAT = "ghp_ใส่โทเคนของคุณที่นี่"
.\push-to-netspin-org.ps1
```

โทเคนต้องมี scope: **`repo`** (ถ้าจะให้สคริปต์สร้าง repo ให้เอง ต้องมี **`admin:org`** ด้วย)

#### ขั้นตอน B — push มือ

```powershell
$env:GITHUB_PAT = "ghp_xxxx"
git remote add netspin https://x-access-token:$env:GITHUB_PAT@github.com/NetSpinGame/NetSpinGame.git
git push -u netspin master
```

จากนั้น: **Settings → Pages →** branch `master`, folder `/`

**เล่นออนไลน์:** https://netspingame.github.io/NetSpinGame/

> อย่าแปะ PAT ในแชทหรือ commit — ใช้แค่ `$env:GITHUB_PAT` ในเครื่องคุณ

## Self-contained build

`assets/symbols/`, `sounds/`, `js/` — no Unity project required on the server.

## Local run

```bash
npx serve . -p 3456
```

Open http://localhost:3456
