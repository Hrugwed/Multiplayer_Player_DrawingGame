# Upstash Redis Setup Guide

## 1. Create Free Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up with GitHub (free)
3. Click "Create Database"
4. Choose:
   - **Name**: drawing-game-redis
   - **Type**: Regional
   - **Region**: US-East-1 (closest to your users)
   - **Plan**: Free (10K commands/day)

## 2. Get Connection Details

After creating the database, you'll get:
- **UPSTASH_REDIS_REST_URL**: `https://xxx.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN**: `AXXXxxx`
- **Redis URL**: `redis://default:xxx@xxx.upstash.io:6379`

## 3. Update Backend Environment

Use the Redis URL in your backend `.env`:
```env
REDIS_URL=redis://default:your_password@your_host.upstash.io:6379
```

## 4. Free Tier Limits

- **10,000 commands per day**
- **256 MB storage**
- **20 concurrent connections**

This is perfect for your drawing game - each stroke is ~1 command, so you can handle 10K drawing strokes per day easily.