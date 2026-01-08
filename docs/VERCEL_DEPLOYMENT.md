# Vercel Frontend Deployment Guide

## 1. Install Vercel CLI

```bash
npm install -g vercel
```

## 2. Deploy Frontend

```bash
cd frontend
vercel login
vercel
```

When prompted:
- **Set up and deploy**: Yes
- **Link to existing project**: No
- **Project name**: `drawing-game-frontend`
- **Directory**: `./` (current directory)
- **Override settings**: No

## 3. Set Environment Variables

After deployment, go to [Vercel Dashboard](https://vercel.com/dashboard):

1. Select your project
2. Go to **Settings** → **Environment Variables**
3. Add these variables:

```env
VITE_API_URL=https://your-drawing-game-backend.fly.dev/api
VITE_SERVER_URL=https://your-drawing-game-backend.fly.dev
```

## 4. Redeploy with Environment Variables

```bash
vercel --prod
```

## 5. Get Your Frontend URL

Your frontend will be available at:
`https://drawing-game-frontend.vercel.app`

## Free Tier Benefits

- **Unlimited deployments**
- **100GB bandwidth/month**
- **Automatic HTTPS**
- **Global CDN**
- **No cold starts**
- **Custom domains** (if you have one)

Perfect for your React frontend!