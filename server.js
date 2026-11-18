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
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data');

// ── Ensure data directory and files exist ────────────────────────────────────
function ensureFile(file, def) {
  const fp = path.join(DATA, file);
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify(def, null, 2));
}

function readJSON(file)       { return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')); }
function writeJSON(file, obj) { fs.writeFileSync(path.join(DATA, file), JSON.stringify(obj, null, 2)); }

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
  cookie: { maxAge: 8 * 60 * 60 * 1000 }  // 8 hours
}));
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const users = readJSON('users.json');
  const user  = users.find(u => u.id === req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
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
  req.session.userId = user.id;
  res.json({ id: user.id, name: user.name, role: user.role, color: user.color, emoji: user.emoji });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const users = readJSON('users.json');
  const user  = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not found' });
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
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

app.post('/api/users', requireAdmin, (req, res) => {
  const { name, role, password, color, emoji } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'Name and password required' });
  const users = readJSON('users.json');
  const id = name.toLowerCase().replace(/\s+/g, '');
  if (users.find(u => u.id === id)) return res.status(400).json({ error: 'User ID already exists' });
  const newUser = { id, name, role: role||'member', password, color: color||'#607d8b', emoji: emoji||'👤', createdAt: today() };
  users.push(newUser);
  writeJSON('users.json', users);
  const { password: _, ...safe } = newUser;
  res.json(safe);
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
  const users = readJSON('users.json');
  const idx   = users.findIndex(u => u.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });
  users[idx] = { ...users[idx], ...req.body };
  writeJSON('users.json', users);
  res.json({ ok: true });
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
  const user = readJSON('users.json').find(u => u.id === req.session.userId);
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
  const users = readJSON('users.json');
  const user  = users.find(u => u.id === req.session.userId);
  const { title, type, desc, priority, status, start, due, planned, notes, assignee } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const realAssignee = user.role === 'admin' ? (assignee || req.session.userId) : req.session.userId;
  const task = {
    id: 'T-' + Date.now().toString(36).toUpperCase(),
    title, type: type||'Task', desc: desc||'',
    priority: priority||'Medium', status: status||'Pending',
    start: start||today(), due: due||'', planned: parseFloat(planned)||0,
    notes: notes||'', assignee: realAssignee,
    createdBy: req.session.userId, createdAt: today(),
  };
  tasks.push(task);
  writeJSON('tasks.json', tasks);
  res.json(task);
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const tasks = readJSON('tasks.json');
  const idx   = tasks.findIndex(t => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Task not found' });
  const user = readJSON('users.json').find(u => u.id === req.session.userId);
  // Members can only edit their own tasks
  if (user.role !== 'admin' && tasks[idx].assignee !== req.session.userId)
    return res.status(403).json({ error: 'Not your task' });
  tasks[idx] = { ...tasks[idx], ...req.body, id: req.params.id };
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
  const users = readJSON('users.json').filter(u => u.id !== 'admin');

  const totalHrs = logs.reduce((a,l) => a + (l.hours||0), 0);
  const plannedHrs = tasks.reduce((a,t) => a + (t.planned||0), 0);

  const byStatus = {};
  const byType   = {};
  tasks.forEach(t => {
    byStatus[t.status] = (byStatus[t.status]||0) + 1;
    byType[t.type]     = (byType[t.type]||0)     + 1;
  });

  const perPerson = users.map(u => {
    const ptasks = tasks.filter(t => t.assignee === u.id);
    const phrs   = logs.filter(l => l.user === u.id).reduce((a,l) => a+(l.hours||0), 0);
    const todayHrs = logs.filter(l => l.user === u.id && l.date === today()).reduce((a,l)=>a+(l.hours||0),0);
    return {
      id: u.id, name: u.name, color: u.color,
      total: ptasks.length,
      completed: ptasks.filter(t=>t.status==='Completed').length,
      inProgress: ptasks.filter(t=>t.status==='In Progress').length,
      pending: ptasks.filter(t=>t.status==='Pending').length,
      blocked: ptasks.filter(t=>t.status==='Blocked').length,
      hoursLogged: phrs,
      hoursPlanned: ptasks.reduce((a,t)=>a+(t.planned||0),0),
      todayHours: todayHrs,
    };
  });

  // Last 7 days daily hours per person
  const days7 = Array.from({length:7},(_,i)=>daysAgo(6-i));
  const dailyHours = days7.map(d => {
    const entry = { date: d };
    users.forEach(u => {
      entry[u.id] = logs.filter(l=>l.user===u.id && l.date===d).reduce((a,l)=>a+(l.hours||0),0);
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
// START
// ════════════════════════════════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
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
