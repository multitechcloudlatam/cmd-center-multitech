const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let projectState = {
  rentingOS: {
    name: 'RentingOS', status: 'online', progress: 65,
    lastUpdate: new Date().toISOString(),
    url: 'https://rentingos-prod.azurewebsites.net',
    bugs: [
      { id: 1, severity: 'high', title: '/api/suppliers - 404 on POST', status: 'open' },
      { id: 2, severity: 'medium', title: 'Modal contracts no cierra en mobile', status: 'open' },
      { id: 3, severity: 'medium', title: 'Inventory query lento (>2s)', status: 'open' }
    ],
    modules: ['Clients', 'Assets', 'Contracts', 'Tickets', 'Suppliers'],
    pendingTasks: [
      'Implementar Siigo billing API (facturacion automatica)',
      'Construir portal de clientes',
      'Modulo vendor purchasing con comparador',
      'Inventario avanzado con tracking de componentes',
      'CRM / Pipeline comercial',
      'Aprobaciones de manager y comercial'
    ],
    deployment: { platform: 'Azure Web Apps', method: 'ZIP deploy', lastDeploy: new Date().toISOString() }
  },
  website: {
    name: 'Website Multitech', status: 'live', progress: 98,
    lastUpdate: new Date().toISOString(),
    url: 'https://www.multi-tech.com.co',
    bugs: [],
    modules: ['Dark Cinematic Design', 'i18n ES/EN/PT + COP/USD/BRL', 'Cotizador 3-step', 'Radware PoC Form', 'Claude AI Chatbot (PHP proxy)', 'Blog System', 'SVG Icons'],
    pendingTasks: ['SEO meta tags + structured data', 'Google Analytics 4', 'Email confirmacion de formularios'],
    deployment: { platform: 'GoDaddy', ssl: true, lastDeploy: new Date().toISOString() }
  }
};

let instructions = [];
let activityLog = [];

function logActivity(msg) {
  activityLog.push({ timestamp: new Date().toISOString(), message: msg });
  if (activityLog.length > 500) activityLog.shift();
}
logActivity('Servidor iniciado - CMD Center operativo');

app.get('/api/dashboard', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    projects: [
      { ...projectState.rentingOS, instructions: instructions.filter(i => i.project === 'rentingos') },
      { ...projectState.website, instructions: instructions.filter(i => i.project === 'website') }
    ],
    summary: {
      totalBugs: projectState.rentingOS.bugs.length + projectState.website.bugs.length,
      pendingInstructions: instructions.filter(i => i.status === 'pending').length,
      lastActivity: activityLog[activityLog.length - 1] || null
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    rentingOS: { status: projectState.rentingOS.status, progress: projectState.rentingOS.progress, bugs: projectState.rentingOS.bugs.length },
    website: { status: projectState.website.status, progress: projectState.website.progress, bugs: projectState.website.bugs.length },
    pendingInstructions: instructions.filter(i => i.status === 'pending').length
  });
});

app.post('/api/instruction', (req, res) => {
  const { project, text, priority } = req.body;
  if (!project || !text) return res.status(400).json({ error: 'project and text required' });
  const instr = { id: 'instr-' + Date.now(), timestamp: new Date().toISOString(), project: project.toLowerCase(), text, priority: priority || 'normal', status: 'pending', author: 'CEO' };
  instructions.push(instr);
  logActivity('Instruccion [' + project.toUpperCase() + ']: ' + text);
  res.status(201).json({ success: true, instruction: instr });
});

app.get('/api/instructions', (req, res) => {
  const { status } = req.query;
  let list = instructions;
  if (status) list = list.filter(i => i.status === status);
  res.json({ total: list.length, instructions: list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) });
});

app.patch('/api/instruction/:id', (req, res) => {
  const instr = instructions.find(i => i.id === req.params.id);
  if (!instr) return res.status(404).json({ error: 'not found' });
  if (req.body.status) instr.status = req.body.status;
  if (req.body.notes) instr.notes = req.body.notes;
  instr.lastUpdate = new Date().toISOString();
  logActivity('Instruccion ' + req.params.id + ' -> ' + instr.status);
  res.json({ success: true, instruction: instr });
});

app.post('/api/bug-report', (req, res) => {
  const { project, title, severity, description } = req.body;
  if (!project || !title) return res.status(400).json({ error: 'project and title required' });
  const key = project.toLowerCase() === 'rentingos' ? 'rentingOS' : 'website';
  const bug = { id: Date.now(), timestamp: new Date().toISOString(), title, severity: severity || 'medium', description, status: 'open' };
  projectState[key].bugs.push(bug);
  logActivity('Bug [' + project + ']: ' + title);
  res.status(201).json({ success: true, bug });
});

app.post('/api/sync', (req, res) => {
  logActivity('Sincronizacion manual ejecutada');
  res.json({ success: true, synced: { timestamp: new Date().toISOString(), projects: 2, pendingInstructions: instructions.filter(i => i.status === 'pending').length } });
});

app.post('/api/backup', (req, res) => {
  const backup = { timestamp: new Date().toISOString(), projects: projectState, instructions, activityCount: activityLog.length };
  logActivity('Backup manual creado');
  res.json({ success: true, backup: { timestamp: backup.timestamp, size: JSON.stringify(backup).length } });
});

app.get('/api/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ total: activityLog.length, activities: activityLog.slice(-limit).reverse() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.patch('/api/project/:key', (req, res) => {
  const key = req.params.key === 'rentingos' ? 'rentingOS' : req.params.key === 'website' ? 'website' : null;
  if (!key || !projectState[key]) return res.status(404).json({ error: 'project not found' });
  ['status', 'progress', 'modules', 'pendingTasks', 'bugs'].forEach(f => {
    if (req.body[f] !== undefined) projectState[key][f] = req.body[f];
  });
  projectState[key].lastUpdate = new Date().toISOString();
  logActivity('Proyecto ' + key + ' actualizado');
  res.json({ success: true, project: projectState[key] });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log('CMD CENTER activo en http://localhost:' + PORT); });
module.exports = app;