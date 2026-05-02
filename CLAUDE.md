# CMD CENTER — Executive Dashboard
## Project Context Document (CLAUDE.md)

### What is this?
A mobile-first executive dashboard that lets the CEO of Multitech Cloud Latam (Jhovan) monitor and control two projects from his phone:
1. **RentingOS** — B2B SaaS on Azure for device/asset renting management in Latin America
2. **Website** — www.multi-tech.com.co

### Stack
- Backend: Node.js + Express (single server.js)
- Frontend: Vanilla HTML/CSS/JS in public/index.html (no build step)
- Hosting: Vercel (serverless Node + static)
- Data: In-memory state (v1). Future: Vercel KV or Supabase.

### Project Structure
```
/
├── server.js          # Express API + static server
├── vercel.json        # Vercel routing
├── package.json       # Only 2 deps: express, cors
├── .gitignore
├── CLAUDE.md          # This file
└── public/
    ├── index.html     # Dashboard UI (mobile-first, PWA)
    └── manifest.json  # PWA manifest
```

### API Endpoints
```
GET    /api/dashboard         → Full state for UI
GET    /api/status            → Quick status
POST   /api/instruction       → { project, text, priority }
GET    /api/instructions      → List all (?status=pending)
PATCH  /api/instruction/:id   → Update status/notes
POST   /api/bug-report        → { project, title, severity }
POST   /api/sync              → Manual sync trigger
POST   /api/backup            → Backup snapshot
GET    /api/activity          → Activity log (?limit=N)
PATCH  /api/project/:key      → Update project state
GET    /api/health            → Health check
```

### Key Business Rules
- Dinamica Tecnologica must NEVER appear on public website
- Contact: contacto@multi-tech.com.co, +57 300 746 7691
- RentingOS: Azure Web Apps, Prisma + PostgreSQL, ZIP deploy
- Website: GoDaddy, dark cinematic design, Claude AI chatbot via PHP proxy
- Siigo billing: monthly anticipatory, day-27 cutoff, 3 product codes

### RentingOS Modules
- Online: Clients, Assets, Contracts, Tickets, Suppliers
- Pending (PRD): CRM/Pipeline, Client Portal, Approvals, Purchasing, ITIL, Inventory, AI Marketing, Siigo Billing

### Website Features
- Dark cinematic, SVG icons, 3-lang (ES/EN/PT), currency switch
- Blog, 3-step cotizador, Radware PoC form, Claude chatbot
- Pending: SEO, GA4, Email confirmations

### Deploy
```bash
npm install
npm start              # local → http://localhost:3000
npx vercel --prod      # production → URL publica
```

### Claude Code Instructions
1. Keep simple: single server.js, single index.html
2. No build tools, no webpack, no React — vanilla is intentional
3. Mobile UX priority — test at 375px viewport
4. PATCH /api/project/:key = how to update state programmatically
5. Never expose Dinamica Tecnologica publicly