# OD Permission System

A full-stack **On-Duty (OD) Request & Approval System** for colleges.  
Students submit OD requests; Counsellor → Class Coordinator → HOD approve them in sequence.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Java 17 · Spring Boot 3.2 · Maven |
| Auth | Supabase (JWT) |
| Database (dev) | H2 in-memory |
| Database (prod) | MySQL |

---

## Project Structure

```
project/
├── src/                        # React frontend (Vite)
│   ├── pages/                  # SignIn, SignUp, StudentDashboard, ApproverDashboard, AdminDashboard
│   ├── lib/                    # api.ts, auth.tsx, supabase.ts, types.ts
│   └── App.tsx
├── backend/                    # Spring Boot backend
│   └── src/main/java/com/college/odsystem/
│       ├── config/             # SecurityConfig, CorsConfig, SpaForwardController
│       ├── controller/         # OdRequestController
│       ├── dto/                # Request/Response DTOs
│       ├── exception/          # GlobalExceptionHandler, ResourceNotFoundException
│       ├── model/              # JPA Entities + Enums
│       ├── repository/         # Spring Data JPA
│       ├── service/            # OdWorkflowService
│       └── scheduler/          # Auto-escalation scheduler
├── .env.example                # Copy to .env and fill in your keys
├── vite.config.ts              # Vite proxy: /api → localhost:8080
└── package.json
```

---

## Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone & Configure

```bash
git clone https://github.com/YOUR_USERNAME/od-permission-system.git
cd od-permission-system

# Copy the example env file and fill in your Supabase credentials
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_SETUP_KEY=your-secret-setup-key
VITE_API_BASE_URL=
```

### 2. Run in Development (two servers)

**Terminal 1 — Spring Boot backend (port 8080):**
```bash
cd backend
./mvnw.cmd spring-boot:run        # Windows
./mvnw spring-boot:run            # Mac/Linux
```

**Terminal 2 — Vite frontend (port 5173):**
```bash
npm install
npm run dev
```

Open: **http://localhost:5173**

### 3. Run as Single JAR (Production)

```bash
# Build frontend
npm run build

# Copy dist into Spring Boot static resources
cp -r dist/* backend/src/main/resources/static/     # Mac/Linux
Copy-Item dist\* backend\src\main\resources\static\ -Recurse -Force  # Windows

# Package and run
cd backend
./mvnw.cmd clean package -DskipTests
java -jar target/od-system-backend-1.0.0.jar
```

Open: **http://localhost:8080**

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/od-requests` | Create a new OD request |
| GET | `/api/od-requests/{id}` | Get request by ID |
| GET | `/api/od-requests/student/{studentId}` | All requests by student |
| GET | `/api/od-requests/pending/{stage}` | Pending queue for an approver stage |
| POST | `/api/od-requests/{id}/approve` | Approve at current stage |
| POST | `/api/od-requests/{id}/reject` | Reject request |
| POST | `/api/od-requests/{id}/return-for-correction` | Return to student |
| POST | `/api/od-requests/{id}/resubmit` | Student resubmits corrected request |
| POST | `/api/od-requests/escalate-now` | Manually trigger auto-escalation |

Valid stage values: `COUNSELLOR`, `CLASS_COORDINATOR`, `HOD`

---

## User Roles

| Role | Permissions |
|---|---|
| `STUDENT` | Submit OD requests, view own history |
| `MANAGER` | Submit OD requests (skips Counsellor stage) |
| `COUNSELLOR` | First-level approval |
| `CLASS_COORDINATOR` | Second-level approval |
| `HOD` | Final approval |
| `ADMIN` | Manage staff role requests |

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_ADMIN_SETUP_KEY` | Secret key to protect the `/setup` page |
| `VITE_API_BASE_URL` | Leave empty (uses Vite proxy in dev, same-origin in prod) |

---

## Deployment

### Railway (Recommended — Free tier)
1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables in Railway dashboard
4. Railway auto-detects Maven and builds + runs the JAR

### Render
1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect GitHub repo
3. Build command: `npm run build && cd backend && ./mvnw clean package -DskipTests`
4. Start command: `java -jar backend/target/od-system-backend-1.0.0.jar`

---

## License
MIT
