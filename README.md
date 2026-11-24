# Team Task Manager — Open Source

A lightweight, robust, and feature-packed team task monitoring and productivity tracking web application.

---

## 🚀 Quick Start

### Step 1 — Start the Server
Double-click `START_SERVER.bat`  
OR run in terminal:
```bash
node server.js
```

### Step 2 — Open in Browser
- **Local Machine:** http://localhost:3000
- **Team members (same network):** http://YOUR-IP:3000  
  *(Your local network IP is printed in the console when the server starts)*
- **Live Online:** https://team-task-manager-yhj7.onrender.com/

---

## 🔐 Default Logins

| User    | Password  | Role    | Designation |
|---------|-----------|---------|-------------|
| `admin`   | `admin123`  | Manager | Team Manager |
| `person1` | `person1`   | Member  | Frontend Developer |
| `person2` | `person2`   | Member  | Backend Developer |

---

## 📦 Tech Stack (100% Free & Open Source)

| Component   | Technology |
|-------------|------------|
| Server      | Node.js + Express |
| Auth        | Dual-layer Session + Token (`x-auth-token`) with `sessions.json` |
| Storage     | Dual Storage: Local JSON (`data/`) + Automatic MongoDB Atlas Cloud Mirror |
| Frontend    | Vanilla HTML5, Modern CSS3 & Vanilla JavaScript (No heavy frameworks required) |
| Live Deploy | Render / Railway / Fly.io / Replit |
| License     | MIT |

---

## ✨ Features & Enhancements

### 1. 👁️ Password Visibility & 🔑 Password Recovery
- **Show / Hide Password:** Toggle password visibility using the eye icon (`👁️` / `🙈`) on the Login screen, User Edit modal, and Password Recovery modals.
- **Team Member Password Reset Request:**
  - Members can click **"Forgot password?"** on the login screen.
  - Enter username, optional contact info, and note.
  - Generates a pending reset request viewable by Administrators.
- **Admin Password Reset Management:**
  - Amber notification banner appears at the top of the **Admin Dashboard** and **Manage Users** view when members request password resets.
  - Admins can resolve requests in 1 click: **"Reset to Default User ID"**, specify a custom password, or dismiss.
- **Admin Master Recovery Key:**
  - If the Administrator forgets the manager password, they can switch to the **"Admin Recovery"** tab on the Forgot Password modal.
  - Enter the Master Recovery Key (default: `admin-recovery-2024` or set via `ADMIN_RECOVERY_KEY` environment variable) to immediately set a new admin password.

### 2. 🛡️ Data Preservation on Render Deploys (Zero Data Loss)
Render's free tier uses ephemeral disks, which means deploying a new Git commit or restarting the web service resets local disk files. To eliminate data loss, **Team Task Manager** provides three built-in solutions:

#### Option A: 1-Click Backup & Safe Merge Restore (Built-in UI)
- Go to **Backup & Sync** in the Admin sidebar.
- Click **"📥 Download Backup (.json)"** to save a complete snapshot of all users, tasks, hour logs, and audit records to your computer.
- After a new deploy, click **"🔄 Safe Merge Upload"** to re-import your backup file.
- **Safe Merge Mode:** Adds newly created users and tasks without deleting or overwriting any existing items!

#### Option B: Automatic Browser Vault (Instant 1-Click Recovery)
- Your browser automatically caches a full snapshot of all team users and tasks in `localStorage` as you work.
- If Render restarts or resets to default seed data, simply open the **Backup & Sync** panel and click **"⚡ Restore Server from Browser Vault"**. All cached users and tasks will be pushed straight into the server immediately.

#### Option C: Permanent Cloud Database (MongoDB Atlas Free M0 — Recommended)
`server.js` includes a native dual-storage driver. When configured, all users, tasks, logs, and sessions are automatically mirrored to the cloud in real-time, completely eliminating data loss across deployments:
1. Create a free M0 cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Copy your connection connection string:  
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/team_task_manager?retryWrites=true&w=majority`
3. In your Render Dashboard:  
   **Your Web Service** ➔ **Environment** ➔ Add Environment Variable:  
   `MONGODB_URI` = `<your-connection-string>`
4. On deployment, the server automatically connects, populates local cache, and permanently persists every change.

### 3. ⏱️ Task Start Time & Live Work Stopwatch
- Specify both **Start Date** and **Start Time** (`HH:MM`) when adding or modifying tasks.
- Check **"⏱️ Start live work timer now"** when adding a task to immediately initiate a live stopwatch and set status to *In Progress*.
- **Top Sticky Timer Bar:** Displays live elapsed time in `HH:MM:SS` format, pulsating indicator, Pause / Resume, and **Stop & Log**.
- Inline **▶️ Timer** and live pulsing **⏹️ Stop** buttons inside All Tasks and My Tasks lists.
- Stopping the timer automatically prompts the Hour Log form with decimal hours and session notes pre-calculated.
- Timer state persists in `localStorage` so it continues running smoothly across page refreshes.

### 4. 🔄 Instant Page Refresh & Anti-Flicker Session Persistence
- Solved session dropping and login window flashing on browser refresh.
- Dual authentication system: Express cookies + `x-auth-token` headers backed by `data/sessions.json`.
- Synchronous anti-flicker head script restores user state and hides login before browser paint.
- Configured `trust proxy` for seamless HTTPS operation on Render.

### 5. 👑 Comprehensive Admin User Editing
- Administrators can edit all details of any team member or admin:
  - Full Name
  - Role (Manager / Team Member)
  - Designation / Job Title
  - Account Status (Active / Inactive)
  - Email Address & Phone Number
  - Avatar Emoji & Theme Color Palette
  - Password Reset / Update (preserves existing password if left blank)
- Automatic cascading updates: updating a user's details keeps all assigned tasks and logged history intact.
- Primary administrator account is protected against accidental demotion or deletion.

---

## 📁 Data Directory Structure

All runtime data is saved in `data/`:
- `data/users.json` — User credentials, roles, designations, and profiles
- `data/tasks.json` — Task titles, types, status, start times, and deadlines
- `data/logs.json` — Detailed work hours logs and blocker reports
- `data/audit.json` — Task deletion audit trail
- `data/sessions.json` — Active user auth tokens and expiry timestamps
- `data/resets.json` — Member password assistance requests

---

## 🚀 How to Store Code in GitHub & Deploy Live to Render.com

### Step 1 — Push Your Code to GitHub

Open a terminal or PowerShell in this project folder:

```bash
# 1. Initialize git in this directory (if not already done)
git init

# 2. Stage all project files
git add .

# 3. Create a commit
git commit -m "Enhance Team Task Manager: professional responsive SaaS UI, timer, password recovery, backup and deploy data preservation"

# 4. Set your primary branch to main
git branch -M main

# 5. Link your local repo to your GitHub repository
# (Create a new empty repo on github.com first, then replace <YOUR-USERNAME> below)
git remote add origin https://github.com/<YOUR-USERNAME>/team-task-manager.git

# 6. Push code to GitHub
git push -u origin main
```

---

### Step 2 — How to Preserve Already Existing Live Users and Tasks Before Redeploying

If you already have a running service on Render (`https://team-task-manager-yhj7.onrender.com/`) with live users and tasks:

#### 1. Instant Live Data Export (Do this BEFORE deploying):
1. Open your live app in Chrome/Edge/Firefox: `https://team-task-manager-yhj7.onrender.com/`
2. Sign in as **Admin**.
3. Press `F12` (or right-click anywhere ➔ **Inspect**) and click the **Console** tab.
4. Copy and paste this single line, then press **Enter**:
```javascript
Promise.all([fetch('/api/users').then(r=>r.json()),fetch('/api/tasks').then(r=>r.json()),fetch('/api/logs').then(r=>r.json())]).then(([u,t,l])=>{const b=new Blob([JSON.stringify({users:u,tasks:t,logs:l},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='live_render_backup.json';a.click();alert('✅ Live data downloaded to your PC!');});
```
This immediately downloads `live_render_backup.json` to your computer containing all your existing live users, tasks, and hour logs!

#### 2. Configure MongoDB Atlas Free Cloud Storage (Never Lose Data on Any Future Deploy):
Render's free tier uses ephemeral containers that reset local disk files on new code builds. By connecting **Free MongoDB Atlas M0**, all your live users and tasks are permanently stored in the cloud:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a **Free M0 Shared Cluster** (Free forever, no credit card).
2. Create a database user & password (e.g. username: `admin`, password: `yourPassword`).
3. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
4. Click **Connect** ➔ **Drivers** ➔ Copy the URI:
   `mongodb+srv://admin:yourPassword@cluster0.mongodb.net/team_task_manager?retryWrites=true&w=majority`
5. In your [Render Dashboard](https://dashboard.render.com):
   - Click your service: `team-task-manager-yhj7`
   - Go to **Environment** tab ➔ **Add Environment Variable**
   - Key: `MONGODB_URI`
   - Value: `mongodb+srv://admin:yourPassword@cluster0.mongodb.net/team_task_manager?retryWrites=true&w=majority`
   - Click **Save Changes**.

---

### Step 3 — Deploy to Render.com

#### Case A: If your Render service is already connected to GitHub:
- Render will automatically detect your `git push` to `main` and trigger a fresh build.
- If you set up `MONGODB_URI`, Render will boot up and preserve all data automatically.
- If you did not use MongoDB, simply open the updated app, log in as Admin, go to **Backup & Sync** ➔ click **🔄 Safe Merge Upload** ➔ select your `live_render_backup.json` file. All users and tasks will be merged back safely!

#### Case B: If setting up a new service on Render:
1. In [Render Dashboard](https://dashboard.render.com), click **New +** ➔ **Web Service**.
2. Connect your GitHub repository `team-task-manager`.
3. Configure settings:
   - **Name:** `team-task-manager`
   - **Region:** Any (e.g. Oregon / Singapore / Frankfurt)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
4. Under **Environment Variables**:
   - `MONGODB_URI` = `<your-mongodb-atlas-uri>`
   - `ADMIN_RECOVERY_KEY` = `admin-recovery-2024` (or your secret recovery key)
5. Click **Deploy Web Service**!
