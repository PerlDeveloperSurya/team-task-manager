/**
 * Team Task Manager — Open-Source Multi-User Server
 * Stack: Node.js + Express + JSON file storage (zero database setup)
 * Run:   node server.js
 * Access: http://localhost:3000  (or http://<your-ip>:3000 from other devices)
 */

const express  = require('express');
const session  = require('express-session');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');
const { v4: uuidv4 } = require('uuid');

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data');

// ── Ensure data directory and files exist ────────────────────────────────────
function ensureFile(file, def) {
  const fp = path.join(DATA, file);
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify(def, null, 2));
}

// ── Storage Engine (Local JSON + Optional MongoDB Atlas Persistent Cloud Storage) ──
let mongoClient = null;
let mongoDb = null;

function readJSON(file) {
  const fp = path.join(DATA, file);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function writeJSON(file, obj, syncMongo = true) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(obj, null, 2));
  if (syncMongo && mongoDb) {
    const col = file.replace('.json', '');
    (async () => {
      try {
        if (Array.isArray(obj)) {
          await mongoDb.collection(col).deleteMany({});
          if (obj.length > 0) {
            await mongoDb.collection(col).insertMany(obj.map(item => ({ ...item })));
          }
        } else if (col === 'sessions') {
          await mongoDb.collection(col).deleteMany({});
          const sessArr = Object.entries(obj).map(([token, data]) => ({ token, ...data }));
          if (sessArr.length > 0) await mongoDb.collection(col).insertMany(sessArr);
        }
      } catch (err) {
        console.error(`[Database] MongoDB sync error for ${col}:`, err.message);
      }
    })();
  }
}

async function initMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return;
  try {
    const { MongoClient } = require('mongodb');
    mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    console.log('\n[Database] ✅ Connected to MongoDB Atlas persistent cloud storage!');

    // Sync all collections from MongoDB into local cache
    const collections = ['users', 'tasks', 'logs', 'audit', 'sessions', 'resets'];
    for (const col of collections) {
      const docs = await mongoDb.collection(col).find({}).toArray();
      if (docs && docs.length > 0) {
        if (col === 'sessions') {
          const sessObj = {};
          docs.forEach(({ _id, token, ...data }) => {
            const key = token || _id;
            sessObj[key] = data;
          });
          writeJSON('sessions.json', sessObj, false);
        } else {
          const cleanDocs = docs.map(({ _id, ...d }) => d);
          writeJSON(col + '.json', cleanDocs, false);
        }
        console.log(`[Database] 📦 Preserved ${docs.length} ${col} from MongoDB Atlas`);
      } else {
        // First-time seed into MongoDB
        const localData = readJSON(col + '.json');
        if (Array.isArray(localData) && localData.length > 0) {
          await mongoDb.collection(col).insertMany(localData.map(d => ({ ...d })));
        } else if (col === 'sessions' && Object.keys(localData).length > 0) {
          const sessArr = Object.entries(localData).map(([token, data]) => ({ token, ...data }));
          if (sessArr.length > 0) await mongoDb.collection(col).insertMany(sessArr);
        }
      }
    }
  } catch (err) {
    console.warn('\n[Database] ⚠️ MongoDB Atlas not connected, operating on local JSON storage:', err.message);
  }
}

function today() { return new Date().toISOString().split('T')[0]; }
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function daysAhead(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Seed default users
ensureFile('users.json', [
  { id:'admin',   name:'Admin',    role:'admin',  password:'admin123', color:'#9c27b0', emoji:'👑', createdAt: today() },
  { id:'person1', name:'Person 1', role:'member', password:'person1',  color:'#1a73e8', emoji:'👤', createdAt: today() },
  { id:'person2', name:'Person 2', role:'member', password:'person2',  color:'#34a853', emoji:'👤', createdAt: today() },
]);

// Seed audit log (deletions)
ensureFile('audit.json', []);

// Seed persistent sessions
ensureFile('sessions.json', {});

// Seed password reset requests
ensureFile('resets.json', []);

// Seed sample tasks
ensureFile('tasks.json', [
  { id:'T-DEMO1', title:'Design Homepage UI',       type:'Requirement', desc:'Create Figma mockups for homepage', priority:'High',   status:'In Progress', start:daysAgo(5),  due:daysAhead(2),  planned:8,  assignee:'person1', notes:'Wireframes done',      createdBy:'person1', createdAt:daysAgo(5) },
  { id:'T-DEMO2', title:'Setup Database Schema',    type:'Task',        desc:'Create PostgreSQL tables',          priority:'High',   status:'Completed',   start:daysAgo(7),  due:daysAgo(1),   planned:6,  assignee:'person2', notes:'Migration ready',      createdBy:'person2', createdAt:daysAgo(7) },
  { id:'T-DEMO3', title:'Write API Endpoints',      type:'Task',        desc:'REST API for auth and users',       priority:'High',   status:'In Progress', start:daysAgo(3),  due:daysAhead(4),  planned:12, assignee:'person2', notes:'Auth endpoints done',  createdBy:'person2', createdAt:daysAgo(3) },
  { id:'T-DEMO4', title:'Dark Mode Enhancement',    type:'Enhancement', desc:'Add dark/light theme toggle',       priority:'Medium', status:'Pending',     start:daysAhead(1),due:daysAhead(5),  planned:5,  assignee:'person1', notes:'',                     createdBy:'person1', createdAt:daysAgo(1) },
  { id:'T-DEMO5', title:'Payment API Integration',  type:'Requirement', desc:'Stripe sandbox integration',        priority:'High',   status:'Upcoming',    start:daysAhead(2),due:daysAhead(7),  planned:10, assignee:'person2', notes:'Needs Stripe keys',   createdBy:'person2', createdAt:daysAgo(1) },
  { id:'T-DEMO6', title:'Fix Login Session Bug',    type:'Bug',         desc:'Session drops on page refresh',     priority:'High',   status:'Blocked',     start:daysAgo(2),  due:daysAhead(1),  planned:3,  assignee:'person1', notes:'Need backend fix',    createdBy:'person1', createdAt:daysAgo(2) },
  { id:'T-DEMO7', title:'Mobile Responsive Layout', type:'Enhancement', desc:'Make all pages mobile-friendly',    priority:'Medium', status:'Upcoming',    start:daysAhead(5),due:daysAhead(10), planned:8,  assignee:'person1', notes:'',                     createdBy:'admin',   createdAt:daysAgo(1) },
  { id:'T-DEMO8', title:'Unit Tests – Auth Module', type:'Task',        desc:'Write Jest tests for auth',         priority:'Medium', status:'Upcoming',    start:daysAhead(5),due:daysAhead(9),  planned:4,  assignee:'person2', notes:'After T-DEMO3 done',  createdBy:'admin',   createdAt:daysAgo(1) },
]);

// Seed sample hour logs
ensureFile('logs.json', [
  { id:'L001', taskId:'T-DEMO1', user:'person1', date:daysAgo(5), hours:3,   desc:'Wireframes for homepage',       blocker:'' },
  { id:'L002', taskId:'T-DEMO1', user:'person1', date:daysAgo(4), hours:2,   desc:'Stakeholder review session',    blocker:'Client feedback pending' },
  { id:'L003', taskId:'T-DEMO2', user:'person2', date:daysAgo(7), hours:2.5, desc:'User and product tables',       blocker:'' },
  { id:'L004', taskId:'T-DEMO2', user:'person2', date:daysAgo(6), hours:3.5, desc:'Migration scripts written',     blocker:'' },
  { id:'L005', taskId:'T-DEMO3', user:'person2', date:daysAgo(3), hours:4,   desc:'User auth endpoints done',      blocker:'' },
  { id:'L006', taskId:'T-DEMO3', user:'person2', date:daysAgo(2), hours:3,   desc:'Product listing endpoints',     blocker:'' },
  { id:'L007', taskId:'T-DEMO6', user:'person1', date:daysAgo(2), hours:1,   desc:'Investigated session bug',      blocker:'Need backend fix' },
  { id:'L008', taskId:'T-DEMO1', user:'person1', date:today(),    hours:3,   desc:'Refined homepage hero section', blocker:'' },
  { id:'L009', taskId:'T-DEMO3', user:'person2', date:today(),    hours:3,   desc:'Order management endpoints',    blocker:'' },
]);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ credentials:true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'team-task-manager-secret-2024',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
    httpOnly: true,
    sameSite: 'lax',
    secure: 'auto'
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth helpers & middleware ──────────────────────────────────────────────────
function getSessionUser(req) {
  const users = readJSON('users.json');
  // 1. Check express-session
  if (req.session && req.session.userId) {
    const u = users.find(x => x.id === req.session.userId);
    if (u) return u;
  }
  // 2. Check token in x-auth-token or authorization header or query
  const token = req.headers['x-auth-token'] || 
    (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null) || 
    req.query.token;

  if (token) {
    const sessions = readJSON('sessions.json');
    const sess = sessions[token];
    if (sess && (!sess.expiresAt || sess.expiresAt > Date.now())) {
      const u = users.find(x => x.id === sess.userId);
      if (u) {
        if (req.session) req.session.userId = u.id;
        return u;
      }
    }
  }
  return null;
}

function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  req.user = user;
  if (req.session) req.session.userId = user.id;
  next();
}

function requireAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  req.user = user;
  if (req.session) req.session.userId = user.id;
  next();
}

// ════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════════════════════
app.post('/api/login', (req, res) => {
  const { userId, username, password } = req.body;
  const q = (username || userId || '').trim().toLowerCase();
  const users = readJSON('users.json');
  const user  = users.find(u => 
    (u.id.toLowerCase() === q || u.name.toLowerCase() === q) && u.password === password
  );
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  if (user.status === 'Inactive') return res.status(403).json({ error: 'Account is deactivated' });

  // Generate persistent auth token
  const token = uuidv4();
  const sessions = readJSON('sessions.json');
  sessions[token] = {
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  writeJSON('sessions.json', sessions);

  req.session.userId = user.id;
  res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    color: user.color,
    emoji: user.emoji,
    email: user.email || '',
    designation: user.designation || '',
    status: user.status || 'Active',
    token: token
  });
});

app.post('/api/logout', (req, res) => {
  const token = req.headers['x-auth-token'] || 
    (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null);
  if (token) {
    const sessions = readJSON('sessions.json');
    if (sessions[token]) {
      delete sessions[token];
      writeJSON('sessions.json', sessions);
    }
  }
  if (req.session) req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json(safeUser);
});

app.put('/api/me', requireAuth, (req, res) => {
  const users = readJSON('users.json');
  const idx   = users.findIndex(u => u.id === req.session.userId);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });

  const current = users[idx];
  const { name, email, phone, designation, color, currentPassword, newPassword } = req.body;

  if (newPassword && newPassword.trim()) {
    if (current.password && current.password !== (currentPassword || '').trim()) {
      return res.status(400).json({ error: 'Current password does not match' });
    }
    if (newPassword.trim().length < 3) {
      return res.status(400).json({ error: 'New password must be at least 3 characters' });
    }
    current.password = newPassword.trim();
  }

  if (name && name.trim()) current.name = name.trim();
  if (email !== undefined) current.email = email.trim();
  if (phone !== undefined) current.phone = phone.trim();
  if (designation !== undefined) current.designation = designation.trim();
  if (color && color.trim()) current.color = color.trim();

  users[idx] = current;
  writeJSON('users.json', users);

  const { password: _, ...safeUser } = current;
  res.json({ ok: true, user: safeUser });
});

// ════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD & PASSWORD RESET
// ════════════════════════════════════════════════════════════════════════
app.post('/api/forgot-password', (req, res) => {
  const { username, contact, note } = req.body;
  if (!username) return res.status(400).json({ error: 'Username or Login ID is required' });
  const q = username.trim().toLowerCase();
  const users = readJSON('users.json') || [];
  const user = users.find(u => u.id.toLowerCase() === q || u.name.toLowerCase() === q);
  if (!user) return res.status(404).json({ error: `No account found with username "${username}"` });

  let resets = readJSON('resets.json') || [];
  const existing = resets.find(r => r.userId === user.id && r.status === 'pending');
  if (existing) {
    existing.requestedAt = new Date().toISOString();
    existing.contact = contact ? contact.trim() : existing.contact;
    existing.note = note ? note.trim() : existing.note;
    writeJSON('resets.json', resets);
    return res.json({ ok: true, message: 'Password reset request refreshed. Your manager has been notified.' });
  }

  const reqObj = {
    id: 'RST-' + uuidv4().split('-')[0].toUpperCase(),
    userId: user.id,
    userName: user.name,
    contact: contact ? contact.trim() : (user.email || user.phone || ''),
    note: note ? note.trim() : '',
    requestedAt: new Date().toISOString(),
    status: 'pending'
  };
  resets.push(reqObj);
  writeJSON('resets.json', resets);
  res.json({ ok: true, message: 'Password reset request submitted. Your manager has been notified and can reset your password from the Admin panel.' });
});

app.post('/api/admin-recovery', (req, res) => {
  const { recoveryKey, newPassword } = req.body;
  const masterKey = process.env.ADMIN_RECOVERY_KEY || 'admin-recovery-2024';
  if (!recoveryKey || recoveryKey.trim() !== masterKey) {
    return res.status(403).json({ error: 'Invalid master recovery key. Default key is "admin-recovery-2024" or set via ADMIN_RECOVERY_KEY.' });
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }
  const users = readJSON('users.json') || [];
  const admin = users.find(u => u.id === 'admin');
  if (!admin) return res.status(404).json({ error: 'Admin account not found' });
  admin.password = newPassword.trim();
  writeJSON('users.json', users);
  res.json({ ok: true, message: 'Admin password reset successfully! You can now log in with your new password.' });
});

app.get('/api/resets', requireAdmin, (req, res) => {
  const resets = readJSON('resets.json') || [];
  res.json(resets.filter(r => r.status === 'pending'));
});

app.post('/api/resets/:id/resolve', requireAdmin, (req, res) => {
  const { newPassword, resetToDefault } = req.body;
  const resets = readJSON('resets.json') || [];
  const reqIdx = resets.findIndex(r => r.id === req.params.id);
  if (reqIdx < 0) return res.status(404).json({ error: 'Reset request not found' });

  const resetReq = resets[reqIdx];
  const users = readJSON('users.json') || [];
  const user = users.find(u => u.id === resetReq.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const passToSet = resetToDefault ? user.id : (newPassword ? newPassword.trim() : user.id);
  user.password = passToSet;
  writeJSON('users.json', users);

  resetReq.status = 'resolved';
  resetReq.resolvedAt = new Date().toISOString();
  resetReq.resolvedBy = req.user.id;
  writeJSON('resets.json', resets);

  res.json({ ok: true, message: `Password for ${user.name} (${user.id}) reset to: "${passToSet}"` });
});

app.delete('/api/resets/:id', requireAdmin, (req, res) => {
  let resets = readJSON('resets.json') || [];
  resets = resets.filter(r => r.id !== req.params.id);
  writeJSON('resets.json', resets);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════
// PUBLIC — login page user list (no passwords, no auth required)
// ════════════════════════════════════════════════════════════════════════
app.get('/api/public/users', (req, res) => {
  const users = readJSON('users.json').map(({ password: _, ...u }) => u);
  res.json(users);
});

// ════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT (Admin only)
// ════════════════════════════════════════════════════════════════════════
app.get('/api/users', requireAuth, (req, res) => {
  const users = readJSON('users.json').map(({ password: _, ...u }) => u);
  res.json(users);
});

app.get('/api/users/:id', requireAdmin, (req, res) => {
  const users = readJSON('users.json');
  const user  = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safeUser } = user;
  res.json({ ...safeUser, hasPassword: !!user.password });
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { name, role, password, color, emoji, email, phone, designation, status, customId } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'Name and password required' });
  const users = readJSON('users.json');
  const id = (customId && customId.trim()) ? customId.trim().toLowerCase().replace(/\s+/g, '') : name.toLowerCase().replace(/\s+/g, '');
  if (users.find(u => u.id === id)) return res.status(400).json({ error: 'User ID already exists' });
  const newUser = {
    id,
    name: name.trim(),
    role: role || 'member',
    password: password.trim(),
    color: color || '#607d8b',
    emoji: emoji || '👤',
    email: email ? email.trim() : '',
    phone: phone ? phone.trim() : '',
    designation: designation ? designation.trim() : '',
    status: status || 'Active',
    createdAt: today()
  };
  users.push(newUser);
  writeJSON('users.json', users);
  const { password: _, ...safe } = newUser;
  res.json(safe);
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
  const users = readJSON('users.json');
  const idx   = users.findIndex(u => u.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });

  const current = users[idx];
  const { name, role, password, color, emoji, email, phone, designation, status, newId } = req.body;

  if (name && !name.trim()) {
    return res.status(400).json({ error: 'User name cannot be empty' });
  }

  // Prevent demoting primary 'admin' user role
  const updatedRole = (req.params.id === 'admin' && role && role !== 'admin')
    ? 'admin'
    : (role || current.role);

  const updatedUser = {
    ...current,
    name: name ? name.trim() : current.name,
    role: updatedRole,
    color: color || current.color,
    emoji: emoji || current.emoji,
    email: email !== undefined ? email.trim() : (current.email || ''),
    phone: phone !== undefined ? phone.trim() : (current.phone || ''),
    designation: designation !== undefined ? designation.trim() : (current.designation || ''),
    status: status || current.status || 'Active',
  };

  // Only update password if a non-empty string is provided
  if (password && password.trim() !== '') {
    updatedUser.password = password.trim();
  }

  // If ID change is requested
  if (newId && newId.trim() !== '' && newId.trim() !== req.params.id) {
    const cleanNewId = newId.trim().toLowerCase().replace(/\s+/g, '');
    if (req.params.id === 'admin') {
      return res.status(400).json({ error: 'Cannot change root admin ID' });
    }
    if (users.find(u => u.id === cleanNewId && u.id !== req.params.id)) {
      return res.status(400).json({ error: 'User ID "' + cleanNewId + '" is already taken' });
    }
    updatedUser.id = cleanNewId;

    // Cascade update in tasks.json
    let tasks = readJSON('tasks.json');
    let tasksChanged = false;
    tasks.forEach(t => {
      if (t.assignee === req.params.id) { t.assignee = cleanNewId; tasksChanged = true; }
      if (t.createdBy === req.params.id) { t.createdBy = cleanNewId; tasksChanged = true; }
    });
    if (tasksChanged) writeJSON('tasks.json', tasks);

    // Cascade update in logs.json
    let logs = readJSON('logs.json');
    let logsChanged = false;
    logs.forEach(l => {
      if (l.user === req.params.id) { l.user = cleanNewId; logsChanged = true; }
    });
    if (logsChanged) writeJSON('logs.json', logs);

    // Cascade update in audit.json
    let audit = readJSON('audit.json');
    let auditChanged = false;
    audit.forEach(a => {
      if (a.deletedBy === req.params.id) { a.deletedBy = cleanNewId; auditChanged = true; }
      if (a.task && a.task.assignee === req.params.id) { a.task.assignee = cleanNewId; auditChanged = true; }
      if (a.task && a.task.createdBy === req.params.id) { a.task.createdBy = cleanNewId; auditChanged = true; }
    });
    if (auditChanged) writeJSON('audit.json', audit);

    // Cascade update in sessions.json
    const sessions = readJSON('sessions.json');
    let sessionsChanged = false;
    Object.keys(sessions).forEach(k => {
      if (sessions[k].userId === req.params.id) {
        sessions[k].userId = cleanNewId;
        sessionsChanged = true;
      }
    });
    if (sessionsChanged) writeJSON('sessions.json', sessions);

    // If current user was renamed
    if (req.session && req.session.userId === req.params.id) {
      req.session.userId = cleanNewId;
    }
  }

  users[idx] = updatedUser;
  writeJSON('users.json', users);

  const { password: _, ...safe } = updatedUser;
  res.json({ ok: true, user: safe });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });
  let users = readJSON('users.json');
  users = users.filter(u => u.id !== req.params.id);
  writeJSON('users.json', users);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════
// TASK ROUTES
// ════════════════════════════════════════════════════════════════════════
app.get('/api/tasks', requireAuth, (req, res) => {
  let tasks = readJSON('tasks.json');
  const user = req.user || readJSON('users.json').find(u => u.id === req.session.userId);
  // Members see only their own tasks; admin sees all
  if (user.role !== 'admin') tasks = tasks.filter(t => t.assignee === req.session.userId);
  // Filters
  if (req.query.status)   tasks = tasks.filter(t => t.status === req.query.status);
  if (req.query.type)     tasks = tasks.filter(t => t.type   === req.query.type);
  if (req.query.assignee) tasks = tasks.filter(t => t.assignee === req.query.assignee);
  if (req.query.search)   tasks = tasks.filter(t =>
    t.title.toLowerCase().includes(req.query.search.toLowerCase()) ||
    t.id.toLowerCase().includes(req.query.search.toLowerCase())
  );
  res.json(tasks);
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const tasks = readJSON('tasks.json');
  const user  = req.user || readJSON('users.json').find(u => u.id === req.session.userId);
  const { title, type, desc, priority, status, start, startTime, due, dueTime, planned, notes, assignee, startTimer } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const realAssignee = user.role === 'admin' ? (assignee || req.session.userId) : req.session.userId;
  
  const now = new Date();
  const currentHHMM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const taskStartTime = startTime || (startTimer ? currentHHMM : '');

  const task = {
    id: 'T-' + Date.now().toString(36).toUpperCase(),
    title: title.trim(),
    type: type || 'Task',
    desc: desc || '',
    priority: priority || 'Medium',
    status: startTimer ? 'In Progress' : (status || 'Pending'),
    start: start || today(),
    startTime: taskStartTime,
    due: due || '',
    dueTime: dueTime || '',
    planned: parseFloat(planned) || 0,
    notes: notes || '',
    assignee: realAssignee,
    createdBy: req.session.userId,
    createdAt: today(),
  };
  tasks.push(task);
  writeJSON('tasks.json', tasks);
  res.json(task);
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const tasks = readJSON('tasks.json');
  const idx   = tasks.findIndex(t => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Task not found' });
  const user = req.user || readJSON('users.json').find(u => u.id === req.session.userId);
  // Members can only edit their own tasks
  if (user.role !== 'admin' && tasks[idx].assignee !== req.session.userId)
    return res.status(403).json({ error: 'Not your task' });
  tasks[idx] = {
    ...tasks[idx],
    ...req.body,
    startTime: req.body.startTime !== undefined ? req.body.startTime : (tasks[idx].startTime || ''),
    dueTime: req.body.dueTime !== undefined ? req.body.dueTime : (tasks[idx].dueTime || ''),
    id: req.params.id
  };
  writeJSON('tasks.json', tasks);
  res.json(tasks[idx]);
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  let tasks = readJSON('tasks.json');
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const user = readJSON('users.json').find(u => u.id === req.session.userId);
  if (user.role !== 'admin' && task.assignee !== req.session.userId)
    return res.status(403).json({ error: 'Not your task' });

  // ── Write to audit log before deleting ───────────────────────────────
  const audit = readJSON('audit.json');
  audit.push({
    id:          'AUD-' + uuidv4().split('-')[0].toUpperCase(),
    action:      'DELETE_TASK',
    deletedBy:   req.session.userId,
    deletedByName: user.name,
    deletedAt:   new Date().toISOString(),
    task: {
      id:        task.id,
      title:     task.title,
      type:      task.type,
      status:    task.status,
      priority:  task.priority,
      assignee:  task.assignee,
      due:       task.due,
      planned:   task.planned,
      desc:      task.desc,
      createdBy: task.createdBy,
      createdAt: task.createdAt,
    },
  });
  writeJSON('audit.json', audit);
  // ─────────────────────────────────────────────────────────────────────

  tasks = tasks.filter(t => t.id !== req.params.id);
  writeJSON('tasks.json', tasks);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════
// HOUR LOG ROUTES
// ════════════════════════════════════════════════════════════════════════
app.get('/api/logs', requireAuth, (req, res) => {
  let logs = readJSON('logs.json');
  const user = readJSON('users.json').find(u => u.id === req.session.userId);
  if (user.role !== 'admin') logs = logs.filter(l => l.user === req.session.userId);
  if (req.query.user)   logs = logs.filter(l => l.user   === req.query.user);
  if (req.query.taskId) logs = logs.filter(l => l.taskId === req.query.taskId);
  if (req.query.date)   logs = logs.filter(l => l.date   === req.query.date);
  res.json(logs.sort((a,b) => b.date.localeCompare(a.date)));
});

app.post('/api/logs', requireAuth, (req, res) => {
  const { taskId, date, hours, desc, blocker } = req.body;
  if (!taskId || hours === undefined) return res.status(400).json({ error: 'taskId and hours required' });
  const logs = readJSON('logs.json');
  const log = {
    id: 'L-' + uuidv4().split('-')[0].toUpperCase(),
    taskId, user: req.session.userId,
    date: date || today(),
    hours: parseFloat(hours) || 0,
    desc: desc||'', blocker: blocker||'',
    createdAt: new Date().toISOString(),
  };
  logs.push(log);
  writeJSON('logs.json', logs);
  res.json(log);
});

app.delete('/api/logs/:id', requireAuth, (req, res) => {
  let logs = readJSON('logs.json');
  const log = logs.find(l => l.id === req.params.id);
  if (!log) return res.status(404).json({ error: 'Log not found' });
  const user = readJSON('users.json').find(u => u.id === req.session.userId);
  if (user.role !== 'admin' && log.user !== req.session.userId)
    return res.status(403).json({ error: 'Not your log' });
  logs = logs.filter(l => l.id !== req.params.id);
  writeJSON('logs.json', logs);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS (Admin)
// ════════════════════════════════════════════════════════════════════════
app.get('/api/stats', requireAdmin, (req, res) => {
  const tasks = readJSON('tasks.json');
  const logs  = readJSON('logs.json');
  const allUsers = readJSON('users.json');

  const totalHrs = Math.round(logs.reduce((a,l) => a + (parseFloat(l.hours)||0), 0) * 10) / 10;
  const plannedHrs = Math.round(tasks.reduce((a,t) => a + (parseFloat(t.planned)||0), 0) * 10) / 10;

  const byStatus = {};
  const byType   = {};
  tasks.forEach(t => {
    byStatus[t.status] = (byStatus[t.status]||0) + 1;
    byType[t.type]     = (byType[t.type]||0)     + 1;
  });

  const perPerson = allUsers.map(u => {
    const ptasks = tasks.filter(t => t.assignee === u.id);
    const phrs   = Math.round(logs.filter(l => l.user === u.id).reduce((a,l) => a + (parseFloat(l.hours)||0), 0) * 10) / 10;
    const todayHrs = Math.round(logs.filter(l => l.user === u.id && l.date === today()).reduce((a,l) => a + (parseFloat(l.hours)||0), 0) * 10) / 10;
    return {
      id: u.id, name: u.name, color: u.color, role: u.role, designation: u.designation || '',
      total: ptasks.length,
      completed: ptasks.filter(t=>t.status==='Completed').length,
      inProgress: ptasks.filter(t=>t.status==='In Progress').length,
      pending: ptasks.filter(t=>t.status==='Pending').length,
      blocked: ptasks.filter(t=>t.status==='Blocked').length,
      hoursLogged: phrs,
      hoursPlanned: Math.round(ptasks.reduce((a,t)=>a+(parseFloat(t.planned)||0),0) * 10) / 10,
      todayHours: todayHrs,
    };
  });

  // Last 7 days daily hours per person
  const days7 = Array.from({length:7},(_,i)=>daysAgo(6-i));
  const dailyHours = days7.map(d => {
    const entry = { date: d };
    allUsers.forEach(u => {
      const dhrs = logs.filter(l=>l.user===u.id && l.date===d).reduce((a,l)=>a+(parseFloat(l.hours)||0),0);
      entry[u.id] = Math.round(dhrs * 10) / 10;
    });
    return entry;
  });

  res.json({ totalTasks:tasks.length, byStatus, byType, totalHrs, plannedHrs, perPerson, dailyHours });
});

// ════════════════════════════════════════════════════════════════════════
// AUDIT LOG — Task Deletions (Admin only)
// ════════════════════════════════════════════════════════════════════════
app.get('/api/audit', requireAdmin, (req, res) => {
  const users = readJSON('users.json');
  const audit = readJSON('audit.json').map(a => {
    const delUser = users.find(u => u.id === a.deletedBy) || {};
    const assUser = users.find(u => u.id === a.task?.assignee) || {};
    const creUser = users.find(u => u.id === a.task?.createdBy) || {};
    return {
      ...a,
      deletedByColor: delUser.color || '#607d8b',
      deletedByEmoji: delUser.emoji || '👤',
      task: {
        ...a.task,
        assigneeName:  assUser.name  || a.task?.assignee,
        assigneeColor: assUser.color || '#607d8b',
        createdByName: creUser.name  || a.task?.createdBy,
      },
    };
  }).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  res.json(audit);
});

app.delete('/api/audit', requireAdmin, (req, res) => {
  writeJSON('audit.json', []);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG (Admin — who did what, when)
// ════════════════════════════════════════════════════════════════════════
app.get('/api/activity', requireAdmin, (req, res) => {
  const tasks = readJSON('tasks.json');
  const logs  = readJSON('logs.json');
  const users = readJSON('users.json');
  const activity = logs.map(l => {
    const task = tasks.find(t=>t.id===l.taskId)||{title:l.taskId,type:'—'};
    const user = users.find(u=>u.id===l.user)||{name:l.user,color:'#607d8b'};
    return { ...l, taskTitle:task.title, taskType:task.type, userName:user.name, userColor:user.color };
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt||''));
  res.json(activity);
});

// ════════════════════════════════════════════════════════════════════════
// DATA BACKUP & RESTORE (Prevent Data Loss on Render Deploys)
// ════════════════════════════════════════════════════════════════════════
app.get('/api/system-status', requireAdmin, (req, res) => {
  const users = readJSON('users.json') || [];
  const tasks = readJSON('tasks.json') || [];
  const logs  = readJSON('logs.json') || [];
  res.json({
    hasMongo: !!mongoDb,
    mongoUriSet: !!process.env.MONGODB_URI,
    storageMode: mongoDb ? 'MongoDB Atlas (Persistent Cloud)' : 'Local JSON Disk (Render Ephemeral)',
    uptime: Math.round(process.uptime()),
    counts: {
      users: users.length,
      tasks: tasks.length,
      logs: logs.length
    }
  });
});

app.get('/api/backup', requireAdmin, (req, res) => {
  const users   = readJSON('users.json') || [];
  const tasks   = readJSON('tasks.json') || [];
  const logs    = readJSON('logs.json') || [];
  const audit   = readJSON('audit.json') || [];
  const resets  = readJSON('resets.json') || [];

  const backupData = {
    appName: 'Team Task Manager',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    exportedBy: req.user.id,
    stats: {
      usersCount: users.length,
      tasksCount: tasks.length,
      logsCount: logs.length,
      auditCount: audit.length,
    },
    users,
    tasks,
    logs,
    audit,
    resets,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="ttm_backup_${today()}.json"`);
  res.json(backupData);
});

app.post('/api/restore', requireAdmin, (req, res) => {
  const { mode, data } = req.body;
  if (!data || (!data.users && !data.tasks)) {
    return res.status(400).json({ error: 'Invalid backup data format' });
  }

  const isMerge = mode !== 'replace'; // Default is safe merge!

  let currentUsers = readJSON('users.json') || [];
  let currentTasks = readJSON('tasks.json') || [];
  let currentLogs  = readJSON('logs.json') || [];
  let currentAudit = readJSON('audit.json') || [];

  let addedUsers = 0, updatedUsers = 0;
  let addedTasks = 0, updatedTasks = 0;
  let addedLogs = 0;

  if (isMerge) {
    // 1. Merge Users
    if (Array.isArray(data.users)) {
      data.users.forEach(bu => {
        const idx = currentUsers.findIndex(u => u.id === bu.id);
        if (idx >= 0) {
          currentUsers[idx] = {
            ...currentUsers[idx],
            ...bu,
            password: bu.password || currentUsers[idx].password
          };
          updatedUsers++;
        } else {
          currentUsers.push(bu);
          addedUsers++;
        }
      });
    }

    // 2. Merge Tasks
    if (Array.isArray(data.tasks)) {
      data.tasks.forEach(bt => {
        const idx = currentTasks.findIndex(t => t.id === bt.id);
        if (idx >= 0) {
          currentTasks[idx] = { ...currentTasks[idx], ...bt };
          updatedTasks++;
        } else {
          currentTasks.push(bt);
          addedTasks++;
        }
      });
    }

    // 3. Merge Logs
    if (Array.isArray(data.logs)) {
      data.logs.forEach(bl => {
        if (!currentLogs.find(l => l.id === bl.id)) {
          currentLogs.push(bl);
          addedLogs++;
        }
      });
    }

    // 4. Merge Audit
    if (Array.isArray(data.audit)) {
      data.audit.forEach(ba => {
        if (!currentAudit.find(a => a.id === ba.id)) {
          currentAudit.push(ba);
        }
      });
    }
  } else {
    // Full Replace Mode
    if (Array.isArray(data.users) && data.users.length > 0) currentUsers = data.users;
    if (Array.isArray(data.tasks)) currentTasks = data.tasks;
    if (Array.isArray(data.logs))  currentLogs = data.logs;
    if (Array.isArray(data.audit)) currentAudit = data.audit;
  }

  writeJSON('users.json', currentUsers);
  writeJSON('tasks.json', currentTasks);
  writeJSON('logs.json', currentLogs);
  writeJSON('audit.json', currentAudit);

  res.json({
    ok: true,
    message: isMerge
      ? `Data merged safely! Users: +${addedUsers} added, ~${updatedUsers} updated. Tasks: +${addedTasks} added, ~${updatedTasks} updated. Logs: +${addedLogs} added.`
      : `Full system restore complete! Restored ${currentUsers.length} users, ${currentTasks.length} tasks, and ${currentLogs.length} hour logs.`,
    summary: {
      totalUsers: currentUsers.length,
      totalTasks: currentTasks.length,
      totalLogs: currentLogs.length,
      mode: isMerge ? 'merge' : 'replace'
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  initMongo();
  const os = require('os');
  const ifaces = os.networkInterfaces();
  let localIP = 'localhost';
  Object.values(ifaces).flat().forEach(i => {
    if (i.family==='IPv4' && !i.internal) localIP = i.address;
  });
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🗂️  TEAM TASK MANAGER — SERVER STARTED     ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}             ║`);
  console.log(`║  Network:  http://${localIP}:${PORT}        ║`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Share the Network URL with your team!        ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Logins:  admin/admin123                      ║');
  console.log('║           person1/person1                     ║');
  console.log('║           person2/person2                     ║');
  console.log('╚══════════════════════════════════════════════╝\n');
});
