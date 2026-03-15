# WorkFlow — Worker Attendance & Payroll Management System

A full-stack MERN + Next.js application for managing workers, attendance, salary calculations, and payments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, TanStack Query, Zustand, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Styling | Custom CSS (no framework) |

---

## Project Structure

```
workflow-app/
├── backend/
│   ├── models/
│   │   ├── User.js          # Owner/Supervisor schema
│   │   ├── Worker.js        # Worker profile schema
│   │   ├── Attendance.js    # Daily attendance records
│   │   └── Payment.js       # Payment transaction records
│   ├── routes/
│   │   ├── auth.js          # Register, login, profile
│   │   ├── workers.js       # Worker CRUD + summary
│   │   ├── attendance.js    # Mark single / bulk / today
│   │   ├── salary.js        # Calculate salary by month
│   │   ├── payments.js      # Create & list payments
│   │   └── dashboard.js     # Dashboard stats aggregate
│   ├── middleware/
│   │   └── auth.js          # JWT protect + adminOnly
│   ├── server.js            # Express entry point
│   ├── seed.js              # Demo data seeder
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── app/
    │   ├── layout.tsx        # Root layout + providers
    │   ├── page.tsx          # Root redirect
    │   ├── globals.css       # Design system CSS
    │   ├── login/page.tsx
    │   ├── register/page.tsx
    │   ├── dashboard/page.tsx
    │   ├── workers/page.tsx
    │   ├── attendance/page.tsx
    │   ├── salary/page.tsx
    │   └── payments/page.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   └── AppShell.tsx
    │   └── ui/
    │       └── index.tsx     # Avatar, StatCard, Modal, etc.
    ├── lib/
    │   ├── api.ts            # Axios client + all API calls
    │   ├── store.ts          # Zustand auth store
    │   └── utils.ts          # Helpers, formatters, constants
    ├── types/
    │   └── index.ts          # All TypeScript types
    ├── next.config.js
    ├── .env.local
    └── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

---

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/workflow_db
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

Start backend:
```bash
# Development
npm run dev

# Seed demo data (creates demo user + 8 workers)
npm run seed
```

Demo credentials after seeding:
- **Email:** demo@workflow.com
- **Password:** demo1234

---

### 2. Frontend Setup

```bash
cd frontend
npm install
```

`.env.local` (already configured):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new owner |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Workers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/workers` | List workers (filter by status/role/search) |
| POST | `/api/workers` | Create worker |
| GET | `/api/workers/:id` | Get single worker |
| PUT | `/api/workers/:id` | Update worker |
| DELETE | `/api/workers/:id` | Delete worker + attendance |
| GET | `/api/workers/:id/attendance-summary` | Monthly summary |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/attendance` | All records (filter month/year/worker) |
| POST | `/api/attendance` | Mark single attendance |
| POST | `/api/attendance/bulk` | Bulk mark for multiple workers |
| GET | `/api/attendance/today` | Today's attendance |
| DELETE | `/api/attendance/:id` | Remove record |

### Salary
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/salary/:workerId` | Calculate salary for month |
| GET | `/api/salary/summary/all` | All workers salary summary |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/payments` | All payments (paginated) |
| POST | `/api/payments` | Create payment record |
| GET | `/api/payments/stats` | Monthly payment stats |
| GET | `/api/payments/:id` | Single payment |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Stats, today attendance, recent payments, week chart |

---

## Key Features

- **Role-based access** — Admin can manage everything; Supervisor can mark attendance but not process payments
- **Auto salary calculation** — Automatic from attendance: present days × daily rate, with half-day and overtime support
- **Bulk attendance** — Mark all workers for a date at once
- **Transparent breakdown** — Every salary shows present/absent/half/leave/overtime/deduction breakdown
- **Payment record** — Every payment stores method, amount, period, deductions, and advance
- **Dashboard stats** — Today's headcount, absent count, weekly chart, recent payments

---

## Production Deployment

### Backend (e.g. Railway, Render)
```bash
npm start
```
Set env vars: `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`

### Frontend (Vercel)
```bash
npm run build
```
Set env var: `NEXT_PUBLIC_API_URL=https://your-backend-url/api`
