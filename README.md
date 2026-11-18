# Team Task Manager — Open Source

## 🚀 Quick Start

### Step 1 — Start the Server
Double-click `START_SERVER.bat`
OR run in terminal:
```bash
node server.js
```

### Step 2 — Open in Browser
- **Your PC:** http://localhost:3000
- **Team members (same network):** http://YOUR-IP:3000
  *(Your IP is printed in the console when server starts)*

---

## 🔐 Default Logins

| User    | Password  | Role    |
|---------|-----------|---------|
| admin   | admin123  | Manager |
| person1 | person1   | Member  |
| person2 | person2   | Member  |

---

## 📦 Tech Stack (100% Free & Open Source)

| Component  | Technology       |
|------------|-----------------|
| Server     | Node.js + Express |
| Auth       | express-session   |
| Database   | JSON files (data/) |
| Frontend   | Vanilla HTML/CSS/JS |
| License    | MIT               |

---

## 👥 Adding Team Members

1. Login as **Admin**
2. Go to **Manage Users** → Add User
3. Share the **network URL** (shown in server console) with your team

---

## 📁 Data Files

All data is stored in the `data/` folder as plain JSON:
- `data/users.json` — user accounts
- `data/tasks.json` — all tasks
- `data/logs.json`  — hour logs

**Backup:** Just copy the `data/` folder.

---

## 🌐 Deploy Online (Free Options)

| Platform  | How |
|-----------|-----|
| **Railway** | Push to GitHub → deploy on Railway.app (free tier) |
| **Render**  | Connect repo to Render.com (free tier) |
| **Fly.io**  | `fly launch` from project folder |
| **Replit**  | Import project, click Run |
