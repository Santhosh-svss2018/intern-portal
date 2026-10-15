# InternConnect AI — Internship Management Portal

InternConnect AI is a full-stack, enterprise-grade Internship Management Portal built with React + Vite, FastAPI, and MongoDB Atlas, featuring Google Gemini AI Career Coaching, role-based access control, task tracking, and real-time application pipelines.

---

## 🌟 Key Features & Role-Based Dashboards

### 1. Student Hub (`/student`)
- **Dashboard Overview**: Alex Morgan profile readiness bar (85% with +15% portfolio URL addition modal), 4 Bento pipeline metric cards (Applied: 14, In Review: 6, Shortlisted: 3, Interviews: 2), application funnel donut chart (SVG), recommended AI-matched internships carousel, upcoming tasks list, and floating AI Coach shortcut button.
- **Explore Internships (`/student/explore`)**: Sticky search bar, horizontal filter chips (*All, Remote, $40+/hr, AI & ML, Software Eng, Summer 2025*), High-Tech Trust Bento Card with 94% match score, skill gap opportunity analysis, 1-tap Interview Question Generator, internship cards with details drawer, save/bookmark toggle, and *Apply with AI Resume* action.
- **Application Tracker (`/student/applications`)**: Status badges (*Applied, In Review, Shortlisted, Interview Scheduled*), interview time & round details, and AI match insights.
- **Mentorship & Tasks (`/student/tasks`)**: View assigned tasks from mentor, submit code PRs, branches, and test notes.
- **AI Career Coach (`/student/ai-coach`)**: Interactive resume text/upload analyzer, skill extractor, gap opportunity recommendations, and custom mock interview simulator.

### 2. Company / Recruiter Portal (`/company`)
- **Company Switcher & Profile**: TechCorp Ventures enterprise hub with active open roles counter and *Post Role* modal.
- **Recruiter Stats Grid**: Active Postings (4), Total Applicants (28), Shortlisted (6), Interviews (3).
- **Segmented View Toggle**: *Manage Job Postings* vs *Review Applicants*.
- **Candidate Stream Queue**: Candidate cards (Alex Morgan, Sarah Lin, David Kim) with avatar, AI skill match %, tech stack tags, AI insight snippets, and live actions: *Reject*, *Shortlist*, and *Schedule Interview* modal.

### 3. Mentor Supervision Portal (`/mentor`)
- **Mentor Profile Header**: Dr. Elena Vance (verified, senior engineering mentor, active status).
- **Supervision Bento Grid**: Assigned Interns (6, Capacity 80%), Active Tasks (12), Pending Submissions (1, Needs Action), Milestone Reviews (2).
- **Assigned Interns Carousel**: Intern cards with animated SVG progress rings (Alex Morgan: 75%, Sarah Chen: 60%, Marcus Vance: 85%).
- **Task Review Queue**: Featured review card for Alex Morgan's API Pagination PR submission (`/v1/payouts` endpoint, PR #142 • 18 files changed), inline supervisor feedback notes with **AI Refine** action, and *Approve* / *Request Revision* live actions.
- **Assign New Task Modal**: Create and dispatch tasks with milestones and priority levels.

### 4. Admin Console & Platform Governance (`/admin`)
- **Platform Telemetry**: Ops Live pulsing indicator, US-East-1 node telemetry, Total Users (12,480), Verified Companies (340), Active Internships (1,850), Applications (48.2k).
- **High Priority Queue**: Pending company verification for *Apex Robotics Inc.* with *Inspect Documents* modal and *Verify & Approve* / *Reject* live actions.
- **Platform Ecosystem Split**: Segmented distribution bar (Students: 78%, Companies: 15%, Mentors: 7%) with counts and percentages.
- **Platform Audit Log**: Real-time event stream (user registration spike, role permissions update, vector embedding cache sync).
- **Compliance & Governance**: 1-click export of SOC2 Type II and FERPA audit reports in JSON format.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, React Router 7, Axios, Material Symbols Outlined, Inter Font |
| **Backend** | Python 3.13, FastAPI, Pydantic v2, PyJWT, Bcrypt, Uvicorn |
| **Database** | MongoDB (PyMongo) with transparent `mongomock` in-memory fallback for zero-configuration local runs |
| **Testing** | Pytest, FastAPI TestClient |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- (Optional) MongoDB local or MongoDB Atlas connection string

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create or activate virtual environment if desired
python -m venv venv
venv\Scripts\activate   # On Windows
# source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env (already configured with sensible defaults)
cp .env.example .env

# Run automated tests
pytest tests/test_api.py -v

# Start FastAPI server
python run.py
# (or: python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload)
```
API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

### 2. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔑 Default Test Credentials & 1-Click Demo Logins

The login screen provides **1-Click Instant Demo Login** buttons for all 4 roles:

| Role | Email | Password |
|---|---|---|
| **Student** | `student@university.edu` | `password123` |
| **Company** | `recruiter@enterprise.com` | `password123` |
| **Mentor** | `mentor@industry.org` | `password123` |
| **Admin** | `admin@internconnect.ai` | `password123` |

You can also register a new account or switch roles on the fly using the Top Role Switcher chip bar.

---

## ☁️ Deployment Instructions

### 1. MongoDB Atlas Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and allow your IP address in Network Access.
3. Copy your connection string: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority`.
4. Set `MONGO_URI` in your backend environment variables.

### 2. Backend Deployment (Render / Railway)
1. Push this repository to GitHub.
2. In [Render](https://render.com), create a new **Web Service**.
3. Set **Root Directory** to `backend`.
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Set Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas URI
   - `JWT_SECRET`: A secure random secret string
   - `ENVIRONMENT`: `production`

### 3. Frontend Deployment (Vercel)
1. In [Vercel](https://vercel.com), import the Git repository.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Set Environment Variable:
   - `VITE_API_URL`: Your deployed Render backend URL (e.g. `https://internconnect-api.onrender.com`)
>>>>>>> 8e35599 (Initial commit: InternConnect AI - Full-Stack Internship Management Portal with Gemini AI & Role Hierarchy)
