# Complete Free Deployment Guide

## 🎯 Overview

This guide will deploy your drawing game completely free with:
- **Backend**: Fly.io (no cold starts)
- **Frontend**: Vercel (global CDN)
- **Redis**: Upstash (10K commands/day)
- **Database**: MongoDB Atlas (512MB free)

## 📋 Prerequisites

- GitHub account
- Node.js installed locally
- Your project code ready

## 🚀 Step 1: Setup Upstash Redis (2 minutes)

1. Go to [console.upstash.com](https://console.upstash.com/)
2. Sign up with GitHub
3. Click "Create Database"
4. Settings:
   - Name: `drawing-game-redis`
   - Type: Regional
   - Region: US-East-1
   - Plan: Free
5. Copy the **Redis URL** (looks like: `redis://default:xxx@xxx.upstash.io:6379`)

## 🚀 Step 2: Deploy Backend to Fly.io (5 minutes)

```bash
# Install Fly CLI (Windows PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Navigate to backend
cd backend

# Login and create app
fly auth login
fly launch --no-deploy

# Set environment variables (replace with your values)
fly secrets set MONGODB_URI="mongodb+srv://hrugwedzagade123_db_user:E4Z8WTHTA7OlK0Vj@cluster0.smhx5kj.mongodb.net/drawing-game?retryWrites=true&w=majority&appName=Cluster0"

fly secrets set REDIS_URL="redis://default:YOUR_UPSTASH_PASSWORD@YOUR_HOST.upstash.io:6379"

fly secrets set NODE_ENV="production"

fly secrets set AI_API_KEY="your_openai_api_key_here"

# Deploy
fly deploy
```

Your backend will be at: `https://your-app-name.fly.dev`

## 🚀 Step 3: Deploy Frontend to Vercel (3 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd ../frontend

# Login and deploy
vercel login
vercel
```

When prompted:
- Project name: `drawing-game-frontend`
- Directory: `./`
- Override settings: No

After deployment:
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - `VITE_API_URL`: `https://your-backend.fly.dev/api`
   - `VITE_SERVER_URL`: `https://your-backend.fly.dev`

```bash
# Redeploy with environment variables
vercel --prod
```

## 🚀 Step 4: Update Backend with Frontend URL

```bash
cd ../backend
fly secrets set FRONTEND_URL="https://your-frontend.vercel.app"
fly deploy
```

## ✅ Step 5: Test Your Deployment

1. Visit your frontend URL: `https://your-frontend.vercel.app`
2. Create a game
3. Test drawing functionality
4. Check multiplayer features

## 📊 Free Tier Limits

### Fly.io Backend
- ✅ 3 shared VMs (256MB each)
- ✅ 3GB storage
- ✅ 160GB bandwidth/month
- ✅ **No cold starts**

### Vercel Frontend
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Global CDN
- ✅ **No cold starts**

### Upstash Redis
- ✅ 10,000 commands/day
- ✅ 256MB storage
- ✅ 20 concurrent connections

### MongoDB Atlas
- ✅ 512MB storage
- ✅ Unlimited connections

## 🔧 Troubleshooting

### Backend Issues
```bash
# Check logs
fly logs

# Check status
fly status
```

### Frontend Issues
```bash
# Check deployment logs
vercel logs your-project-name
```

### Redis Connection Issues
- Verify Redis URL format in Fly.io secrets
- Check Upstash dashboard for connection stats

## 🎉 Success!

Your drawing game is now deployed completely free with:
- ⚡ **No cold starts** (Fly.io keeps backend warm)
- 🌍 **Global performance** (Vercel CDN)
- 🔄 **Real-time Redis** (Upstash)
- 📱 **Mobile-friendly** (responsive design)

Total cost: **$0/month** 🎊