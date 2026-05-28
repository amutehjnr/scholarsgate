# ScholarsGate — Elite USA High School Scholarship Platform

A premium, production-grade scholarship and admission platform connecting international families with elite American boarding schools.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in credentials
npm run seed           # seed schools & scholarships
npm run dev            # start development server
```

Visit http://localhost:3000

Admin login: /auth/admin/login (use ADMIN_EMAIL + ADMIN_PASSWORD from .env)

## Tech Stack
- Node.js + Express.js (MVC)
- MongoDB Atlas + Mongoose
- EJS + Custom CSS (no frameworks)
- JWT Auth (Access + Refresh tokens)
- Cloudinary (file uploads)
- PDFKit (offer letters)
- Nodemailer (email)
- Render (deployment)

## Roles
- guardian — Parent dashboard
- admission_officer — Review applications
- school_admin — School-level management
- platform_admin — Full platform access

## Deploy to Render
1. Push to GitHub
2. New Web Service on render.com
3. Build: npm install | Start: node server.js
4. Add all env vars from .env.example
5. After deploy, run seeder in Shell tab

See full docs in /README.md
