# Fly.io Backend Deployment Guide

## 1. Install Fly.io CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Or download from: https://github.com/superfly/flyctl/releases
```

## 2. Login and Initialize

```bash
cd backend
fly auth login
fly launch --no-deploy
```

When prompted:
- **App name**: `your-drawing-game-backend` (must be unique)
- **Region**: `iad` (Washington D.C. - good performance)
- **PostgreSQL**: No (we're using MongoDB)
- **Redis**: No (we're using Upstash)

## 3. Set Environment Variables

```bash
fly secrets set MONGODB_URI="mongodb+srv://hrugwedzagade123_db_user:E4Z8WTHTA7OlK0Vj@cluster0.smhx5kj.mongodb.net/drawing-game?retryWrites=true&w=majority&appName=Cluster0"

fly secrets set REDIS_URL="redis://default:YOUR_UPSTASH_PASSWORD@YOUR_HOST.upstash.io:6379"

fly secrets set NODE_ENV="production"

fly secrets set AI_API_KEY="your_openai_api_key_here"

fly secrets set FRONTEND_URL="https://your-frontend.vercel.app"
```

## 4. Deploy

```bash
fly deploy
```

## 5. Get Your Backend URL

After deployment, your backend will be available at:
`https://your-drawing-game-backend.fly.dev`

## Free Tier Limits

- **3 shared VMs** (256MB RAM each)
- **3GB storage**
- **160GB bandwidth/month**
- **No cold starts** with `auto_stop_machines = false`

Perfect for your real-time drawing game!