# 🚀 SmartCut AI Deployment Guide

This guide provides instructions for deploying SmartCut AI for your hackathon submission.

## 🏗 Prerequisites
- Git installed.
- Docker & Docker Compose (for Backend/VPS deployment).
- Account on a hosting platform (e.g., [Render](https://render.com), [Fly.io](https://fly.io), or [Vercel](https://vercel.com)).

---

## 1. Frontend Deployment (Static Hosting)
The frontend is built as a static site. Recommended: **Vercel** or **Netlify**.

### Steps:
1. Connect your GitHub repository to Vercel/Netlify.
2. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variables**:
   - Set `VITE_API_BASE_URL` to your Backend URL (e.g., `https://smartcut-api.onrender.com/api/v1`).
4. **Routing**:
   - Ensure the included `vercel.json` is in the root directory to handle SPA routing correctly.

---

## 2. Backend Deployment (Web Service)
The backend requires a Python environment or Docker. Recommended: **Render** or **Fly.io**.

### Detailed Render Deployment Steps (Recommended)
1.  **Create a Blueprint**:
    - Go to **Blueprints** in your Render dashboard.
    - Click **"New Blueprint Instance"**.
    - Connect your GitHub repo.
    - Render will detect the `render.yaml` file and set up EVERYTHING (Backend, Disk, Env Vars) automatically.

2.  **Manual Setup (if not using Blueprints)**:
    - Select **New Web Service** > **Docker**.
    - **Environment Variables**:
      - `DATABASE_URL`: `sqlite:////app/storage/smartcut.db`
      - `STORAGE_PATH`: `/app/storage`
      - `BACKEND_CORS_ORIGINS`: `https://your-frontend.vercel.app` (comma-separated list).
    - **Disk (REQUIRED)**:
      - Go to the **"Disks"** tab in your service.
      - Click **"Add Disk"**.
      - Name: `smartcut-storage`.
      - Mount Path: `/app/storage`.
      - Size: `1 GB` (Free tier is fine).

3.  **ml Models**: Render's free tier is limited. If you find the AI analysis is too slow or crashing, consider a paid instance ($7/mo) or pre-downloading models into the Docker image.

### Option B: VPS (Using Docker Compose)
1. Clone your repo to the server.
2. Run: `docker-compose up -d --build`
3. The backend will be available on port `8000`.

---

## 3. Production Environment Variables
| Variable | Description | Recommended |
| :--- | :--- | :--- |
| `PROJECT_NAME` | Name of your app | `SmartCut AI` |
| `DEBUG` | FastAPI Debug mode | `false` |
| `SECRET_KEY` | For security tokens | A long random string |
| `BACKEND_CORS_ORIGINS` | Allowed frontend URLs | `["https://your-frontend.vercel.app"]` |

---

## 🏆 The "Best" Option: Railway.app (Highly Recommended for AI)
For an AI-heavy app like SmartCut (which uses Torch, Whisper, and YOLO), **Railway** is often superior to Render because it handles resource-heavy builds better and has an extremely fast deployment pipeline.

### Why Railway?
- **Better RAM handling**: Less likely to crash during ML model loading.
- **Easy Persistence**: Native "Volume" support that is more stable than Render's free disks.
- **Speed**: Deploying via their CLI is significantly faster for iterations.

### Steps:
1.  Install Railway CLI: `npm i -g @railway/cli`.
2.  Login: `railway login --browserless` (if on a server/remote).
3.  **Initialize Project**: Run `railway init`. Select **"Empty Project"**.
4.  Add a **Volume**: In the Railway dashboard, create a volume and mount it at `/app/storage`.
5.  Set Variables:
    - `DATABASE_URL`: `sqlite:////app/storage/smartcut.db`
    - `STORAGE_PATH`: `/app/storage`
    - `BACKEND_CORS_ORIGINS`: Your Vercel URL.
6.  Deploy: `railway up --detach`.

---

## 💡 Pro-Tips for Hackathon Submission
- **Demo Video**: Use the recording tool to capture a smooth walkthrough of your best features.
- **Portability**: Ensure your `docker-compose.yml` works out-of-the-box for judges who want to test locally.
- **Persistence**: If using a platform like Render, **MUST** use a "Persistent Disk" for SQLite, otherwise, your data will reset every time the server restarts.
