# GoalPortal — MERN Stack Goal Setting & Tracking Portal

A full-featured, production-grade Goal Setting & Tracking Portal built with MongoDB, Express, React, and Node.js.

---

## Features

### Phase 1 — Goal Creation & Approval
- Employee goal creation with Thrust Area, UoM, Target, and Weightage
- System-enforced validation: 100% total weightage, 10% minimum per goal, max 8 goals
- Manager (L1) approval workflow with inline editing
- Goal lock on approval; admin can unlock
- Shared Goals — push departmental KPIs to multiple employees

### Phase 2 — Achievement Tracking & Quarterly Check-ins
- Quarterly achievement logging with auto-computed scores
- 4 UoM types: Numeric Min (↑), Numeric Max (↓), Timeline, Zero-based
- Manager check-in module with structured comments
- Achievement sync for shared goals from primary owner

### Reporting & Governance
- Achievement Report: Planned vs Actual, per employee, per quarter
- CSV/Excel export of full achievement data
- Completion Dashboard: real-time check-in tracking per employee/quarter
- Audit Trail: every post-lock change logged (who/what/when)

### User Roles
| Role     | Access                                                          |
|----------|-----------------------------------------------------------------|
| Employee | Create goals, log achievements, view own data                   |
| Manager  | Approve/return goals, conduct check-ins, view team reports      |
| Admin    | Full access: cycle config, user management, audit log, unlocks  |

---

## Tech Stack

| Layer     | Technology                           |
|-----------|--------------------------------------|
| Frontend  | React 18, React Router v6, Recharts  |
| Backend   | Node.js, Express 4                   |
| Database  | MongoDB, Mongoose 8                  |
| Auth      | JWT (jsonwebtoken + bcryptjs)        |
| Validation| express-validator                    |
| Export    | json2csv                             |

---

## Project Structure

```
goal-portal/
├── server/
│   ├── index.js              # Express entry point
│   ├── seed.js               # Database seeder
│   ├── middleware/
│   │   └── auth.js           # JWT protect + role authorize
│   ├── models/
│   │   ├── User.js           # User schema (employee/manager/admin)
│   │   ├── Goal.js           # Goal + achievements + audit log
│   │   ├── Checkin.js        # Quarterly check-in records
│   │   └── Cycle.js          # Cycle/calendar configuration
│   └── routes/
│       ├── auth.js           # Login, register, /me
│       ├── goals.js          # Full goals CRUD + approval + shared
│       ├── checkins.js       # Check-in create + dashboard
│       ├── reports.js        # Achievement report + CSV export + audit
│       ├── users.js          # User management
│       └── admin.js          # Cycle management + org stats
│
└── client/src/
    ├── App.js                # Routes + role-based guards
    ├── context/AuthContext.js
    ├── utils/
    │   ├── api.js            # Axios API wrappers per resource
    │   └── helpers.js        # Score colors, formatters, constants
    └── pages/
        ├── LoginPage.js
        ├── RegisterPage.js
        ├── DashboardPage.js  # Role-aware: employee or manager view
        ├── GoalsPage.js      # Goal CRUD + achievement logger
        ├── TeamGoalsPage.js  # Manager approval + shared goal push
        ├── CheckinsPage.js   # Conduct, history, completion dashboard
        ├── ReportsPage.js    # Achievement table + charts + CSV export
        ├── AuditPage.js      # Audit trail table
        └── AdminPage.js      # Cycles, users, org overview
```

---

## Quick Start

### Prerequisites
- Node.js >= 16
- MongoDB running locally (or provide a cloud URI)

### 1. Clone & Install

```bash
git clone <repo-url>
cd goal-portal

# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET
```

### 3. Seed Database

```bash
node server/seed.js
```

This creates:
- **Admin:** admin@demo.com / demo1234
- **Manager:** manager@demo.com / demo1234  
- **Manager:** manager2@demo.com / demo1234
- **Employee:** employee@demo.com / demo1234
- **+ 5 more employees** across Sales & Operations

### 4. Run Development Server

```bash
npm run dev
```

Runs both backend (port 5000) and React frontend (port 3000) concurrently.

Open **http://localhost:3000**

---

## API Reference

### Auth
| Method | Endpoint            | Description        |
|--------|---------------------|--------------------|
| POST   | /api/auth/register  | Register new user  |
| POST   | /api/auth/login     | Login, get JWT     |
| GET    | /api/auth/me        | Get current user   |

### Goals
| Method | Endpoint                      | Role               | Description                     |
|--------|-------------------------------|--------------------|---------------------------------|
| POST   | /api/goals                    | Employee/Manager   | Create goal                     |
| GET    | /api/goals/my                 | Employee/Manager   | My goals for a cycle            |
| GET    | /api/goals/team               | Manager/Admin      | Team goals (filterable)         |
| PUT    | /api/goals/:id                | Employee/Admin     | Edit goal (draft/returned only) |
| DELETE | /api/goals/:id                | Employee           | Delete draft goal               |
| POST   | /api/goals/submit             | Employee/Manager   | Submit all drafts for approval  |
| PUT    | /api/goals/:id/approve        | Manager/Admin      | Approve or return a goal        |
| POST   | /api/goals/:id/achievement    | Employee           | Log quarterly achievement       |
| POST   | /api/goals/shared             | Admin/Manager      | Push shared goal to employees   |
| PUT    | /api/goals/:id/unlock         | Admin              | Unlock a locked goal            |

### Check-ins
| Method | Endpoint               | Role          | Description                    |
|--------|------------------------|---------------|--------------------------------|
| POST   | /api/checkins          | Manager/Admin | Complete a check-in            |
| GET    | /api/checkins          | All           | Get check-ins (filtered)       |
| GET    | /api/checkins/dashboard| Manager/Admin | Completion dashboard           |

### Reports
| Method | Endpoint                        | Role          | Description             |
|--------|---------------------------------|---------------|-------------------------|
| GET    | /api/reports/achievement        | Manager/Admin | Achievement report JSON |
| GET    | /api/reports/achievement/export | Manager/Admin | Download CSV            |
| GET    | /api/reports/audit              | Admin         | Audit log               |

---

## Score Formula Reference

| UoM Type     | Formula                                      | Notes                    |
|--------------|----------------------------------------------|--------------------------|
| Numeric Min  | (Actual ÷ Target) × 100                      | Higher is better         |
| Numeric Max  | (Target ÷ Actual) × 100                      | Lower is better          |
| Timeline     | 100% if on time, −5% per day late            | Date comparison          |
| Zero-based   | 100% if actual = 0, else 0%                  | Binary outcome           |

---

## Check-in Schedule

| Period         | Window     | Action                              |
|----------------|------------|-------------------------------------|
| Goal Setting   | 1st May    | Create, Submit & Approve Goals      |
| Q1 Check-in    | July       | Progress Update — Planned vs Actual |
| Q2 Check-in    | October    | Progress Update — Planned vs Actual |
| Q3 Check-in    | January    | Progress Update — Planned vs Actual |
| Q4 / Annual    | March/April| Final Achievement Capture           |

---

## Production Build

```bash
npm run build   # builds React into client/build/
npm start       # runs Express serving both API + static frontend
```
