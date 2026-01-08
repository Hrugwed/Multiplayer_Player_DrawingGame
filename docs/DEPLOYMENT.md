# Deployment Guide

This guide covers deploying the Collaborative Drawing Game to various platforms.

## 🏗️ Architecture Overview

The application consists of two main parts:
- **Backend**: Node.js API server with Socket.IO (in `backend/` directory)
- **Frontend**: React SPA built with Vite (in `frontend/` directory)

## 🚀 Backend Deployment

### Railway (Recommended)

1. **Prepare the backend**
   ```bash
   cd backend
   ```

2. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

3. **Login and deploy**
   ```bash
   railway login
   railway init
   railway up
   ```

4. **Set environment variables**
   ```bash
   railway variables set MONGODB_URI=your_mongodb_connection_string
   railway variables set REDIS_URL=your_redis_url
   railway variables set AI_API_KEY=your_openai_api_key
   railway variables set NODE_ENV=production
   railway variables set FRONTEND_URL=https://your-frontend-domain.com
   ```

### Heroku

1. **Create Heroku app**
   ```bash
   cd backend
   heroku create your-app-name
   ```

2. **Set environment variables**
   ```bash
   heroku config:set MONGODB_URI=your_mongodb_connection_string
   heroku config:set REDIS_URL=your_redis_url
   heroku config:set AI_API_KEY=your_openai_api_key
   heroku config:set NODE_ENV=production
   heroku config:set FRONTEND_URL=https://your-frontend-domain.com
   ```

3. **Deploy**
   ```bash
   git subtree push --prefix backend heroku main
   ```

### DigitalOcean App Platform

1. **Create app from GitHub**
   - Connect your repository
   - Set source directory to `backend/`
   - Set build command: `npm install`
   - Set run command: `npm start`

2. **Configure environment variables** in the DigitalOcean dashboard

## 🌐 Frontend Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy from frontend directory**
   ```bash
   cd frontend
   vercel
   ```

3. **Set environment variables** in Vercel dashboard:
   - `VITE_API_URL`: Your backend API URL
   - `VITE_SOCKET_URL`: Your backend Socket.IO URL

### Netlify

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify**
   - Drag and drop the `dist/` folder to Netlify
   - Or connect your GitHub repository

3. **Set environment variables** in Netlify dashboard

### GitHub Pages

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy using gh-pages**
   ```bash
   npm install -g gh-pages
   gh-pages -d dist
   ```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create a cluster** at [MongoDB Atlas](https://cloud.mongodb.com/)
2. **Create a database user**
3. **Whitelist your deployment IP** (or use 0.0.0.0/0 for all IPs)
4. **Get connection string** and use it as `MONGODB_URI`

### Redis Cloud

1. **Create a database** at [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
2. **Get connection URL** and use it as `REDIS_URL`

## 🔧 Environment Variables

### Backend Environment Variables

```env
# Required
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/drawing-game

# Optional but recommended
REDIS_URL=redis://user:pass@host:port
AI_API_KEY=sk-your-openai-api-key
FRONTEND_URL=https://your-frontend-domain.com

# API Configuration
AI_API_URL=https://api.openai.com/v1/chat/completions
```

### Frontend Environment Variables

```env
VITE_API_URL=https://your-backend-domain.com
VITE_SOCKET_URL=https://your-backend-domain.com
```

## 🔒 Security Considerations

### Backend Security

1. **Environment Variables**: Never commit `.env` files
2. **CORS**: Set `FRONTEND_URL` to your actual frontend domain
3. **Rate Limiting**: Already configured in the backend
4. **Input Validation**: Joi validation is implemented
5. **Helmet**: Security headers are configured

### Frontend Security

1. **Environment Variables**: Use `VITE_` prefix for public variables
2. **API URLs**: Use HTTPS in production
3. **Content Security Policy**: Consider implementing CSP headers

## 📊 Monitoring and Logging

### Backend Monitoring

1. **Health Check Endpoint**: `GET /health`
2. **Logs**: Use your platform's logging service
3. **Error Tracking**: Consider integrating Sentry

### Performance Optimization

1. **Redis Caching**: Ensure Redis is properly configured
2. **Database Indexing**: MongoDB indexes are configured in models
3. **Compression**: Gzip compression is enabled
4. **Static Assets**: Frontend assets are optimized by Vite

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `FRONTEND_URL` is set correctly
   - Check that frontend is making requests to correct backend URL

2. **Socket.IO Connection Issues**
   - Verify `VITE_SOCKET_URL` matches backend URL
   - Check firewall settings for WebSocket connections

3. **Database Connection Issues**
   - Verify MongoDB URI format
   - Check IP whitelist in MongoDB Atlas
   - Ensure database user has proper permissions

4. **AI Analysis Failures**
   - Check OpenAI API key validity
   - Verify API quota and billing
   - Fallback responses will be used if AI fails

### Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables configured
- [ ] Database connections working
- [ ] Socket.IO connections working
- [ ] CORS properly configured
- [ ] SSL certificates configured (HTTPS)
- [ ] Domain names configured
- [ ] Error monitoring setup
- [ ] Backup strategy in place

## 📞 Support

If you encounter deployment issues:

1. Check the logs on your deployment platform
2. Verify all environment variables are set
3. Test API endpoints manually
4. Check database connectivity
5. Review the troubleshooting section above

For additional help, create an issue in the GitHub repository with:
- Deployment platform used
- Error messages or logs
- Steps to reproduce the issue
- Environment configuration (without sensitive data)