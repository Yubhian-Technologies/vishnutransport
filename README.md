# College Bus Management System

A full-stack, role-based College Bus Management System built with **React.js + Node.js/Express + Firebase**.

## Architecture

```
college-bus-management/
├── client/          # React 18 + Vite + Tailwind CSS frontend
└── server/          # Node.js + Express backend (Firebase Admin SDK)
```

## Roles

| Role | Dashboard | Key Actions |
|------|-----------|-------------|
| **Super Admin** | `/admin` | Manage all users, system config, full access |
| **Bus Coordinator** | `/coordinator` | Manage colleges/routes, Level 1 review |
| **Accounts** | `/accounts` | Level 2 payment verification, financial reports |
| **Bus Incharge** | `/incharge` | View route students, seat occupancy |
| **Student** | `/student` | Apply for bus, track application status |

## Application Status Flow

```
Student Submits → Pending (Coordinator)
                       │
         ┌─────────────┴──────────────┐
     Approve                       Reject
         │                            │
  Pending (Accounts)          Rejected (Level 1)
         │
  ┌──────┴──────┐
Approve       Reject
  │               │
Seat          Rejected
Confirmed     (Level 2)
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project ([console.firebase.google.com](https://console.firebase.google.com))

---

### Step 1 — Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (e.g., `college-bus-system`)
3. Enable **Authentication** → Email/Password provider
4. Create **Firestore Database** in production mode
5. Enable **Firebase Storage**

---

### Step 2 — Firebase Admin SDK (Backend)

1. Firebase Console → Project Settings → **Service Accounts**
2. Click **Generate new private key** → download JSON
3. In `server/`, copy `.env.example` to `.env`:

```bash
cd server
cp .env.example .env
```

4. Fill in your `.env` values from the downloaded JSON:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
CLIENT_URL=http://localhost:5173
```

---

### Step 3 — Firebase Client SDK (Frontend)

1. Firebase Console → Project Settings → **Your Apps** → Add Web App
2. Copy the config values
3. In `client/`, copy `.env.example` to `.env`:

```bash
cd client
cp .env.example .env
```

4. Fill in:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=http://localhost:5000/api
```

---

### Step 4 — Firestore Security Rules

In Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: only read own document, admin writes via server SDK
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false; // Server-side only
    }
    // All other reads/writes via backend API
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

### Step 5 — Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false; // Server-side only
    }
  }
}
```

---

### Step 6 — Install & Run

**Backend:**
```bash
cd server
npm install
npm run dev
# Runs on http://localhost:5000
```

**Frontend:**
```bash
cd client
npm install
npm run dev
# Runs on http://localhost:5173
```

---

### Step 7 — Create First Super Admin

Since Super Admins can't self-register, call the API directly after starting the server:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@college.edu",
    "password": "SecurePass123",
    "name": "Super Admin",
    "role": "super_admin"
  }'
```

> **Note:** For production, restrict this endpoint. After the first super admin is created, all subsequent staff users should be created via the Admin → User Management panel.

---

## Database Collections (Firestore)

| Collection | Purpose |
|------------|---------|
| `users` | All users (all roles) |
| `colleges` | College info, QR codes, bank details |
| `busRoutes` | Routes, capacity, fare, driver info |
| `boardingPoints` | Boarding stops per route |
| `applications` | Student bus applications (full lifecycle) |

---

## API Endpoints

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/register` | Public |
| GET | `/api/auth/profile` | Authenticated |
| PATCH | `/api/auth/profile` | Authenticated |

### Colleges
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/colleges` | Authenticated |
| POST | `/api/colleges` | Coordinator+ |
| PUT | `/api/colleges/:id` | Coordinator+ |
| POST | `/api/colleges/:id/qr-code` | Coordinator+ |
| PUT | `/api/colleges/:id/bank-details` | Coordinator+ |
| DELETE | `/api/colleges/:id` | Super Admin |

### Routes
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/bus-routes` | Authenticated |
| POST | `/api/bus-routes` | Coordinator+ |
| PUT | `/api/bus-routes/:id` | Coordinator+ |
| PATCH | `/api/bus-routes/:id/assign-incharge` | Coordinator+ |
| DELETE | `/api/bus-routes/:id` | Super Admin |

### Applications
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/applications` | Student |
| GET | `/api/applications/my` | Student |
| GET | `/api/applications` | Staff |
| PATCH | `/api/applications/:id/coordinator-review` | Coordinator+ |
| PATCH | `/api/applications/:id/accounts-review` | Accounts+ |

### Analytics
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/analytics/dashboard` | Staff |
| GET | `/api/analytics/routes` | Staff |
| GET | `/api/analytics/revenue` | Staff |

---

## Production Deployment

### Frontend (Vercel / Netlify)

```bash
cd client
npm run build
# Deploy the `dist/` folder
```

Add environment variables in your hosting dashboard.

### Backend (Railway / Render / GCP Cloud Run)

```bash
cd server
# Set environment variables
# Start: node src/index.js
```

**Dockerfile (optional):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 5000
CMD ["node", "src/index.js"]
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Routing | React Router v6 |
| State | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| File Upload | React Dropzone |
| Backend | Node.js, Express 4 |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| File Storage | Firebase Storage |
| PDF Export | jsPDF + AutoTable |
| CSV Export | PapaParse |

---

## Key Features

- **Multi-step application form** with route/seat availability checks
- **Two-level verification** (Coordinator → Accounts)
- **Real-time seat tracking** with conflict prevention
- **QR code & bank details** per college for payments
- **File upload** for payment proof (image/PDF)
- **Role-based dashboards** — each role sees only relevant data
- **Analytics & charts** — occupancy, revenue, application status
- **Export to CSV & PDF** for all reports
- **Rate limiting, helmet, CORS** for API security
- **Responsive UI** — mobile-first Tailwind design
