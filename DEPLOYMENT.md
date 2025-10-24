# Deployment Guide

This guide explains how to deploy your GiftAI application locally or on Vercel.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (for production)
- Environment variables configured

## Local Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/giftai

# Session Secret (generate a random string)
SESSION_SECRET=your-random-secret-key-here

# API Keys
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: For Amazon Product API
# Add your Amazon API credentials if you have them

# Port (default: 5000)
PORT=5000
```

### 3. Set Up Database

Push the database schema:

```bash
npm run db:push
```

If you encounter issues, use:

```bash
npm run db:push --force
```

### 4. Run the Application

Development mode (with hot reload):

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

The application will be available at `http://localhost:5000`

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Prepare for Deployment

Make sure you have a `vercel.json` configuration file in your root directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. Add Build Script

Update your `package.json` to include a build script for Vercel:

```json
{
  "scripts": {
    "build": "vite build && tsc",
    "vercel-build": "npm run build"
  }
}
```

### 4. Set Up Database on Vercel

#### Option A: Use Vercel Postgres

1. Go to your Vercel project dashboard
2. Navigate to "Storage" tab
3. Create a new Postgres database
4. Copy the `DATABASE_URL` connection string

#### Option B: Use External Postgres (Neon, Supabase, etc.)

1. Create a database on your preferred provider
2. Get the connection string
3. Add it to Vercel environment variables

### 5. Configure Environment Variables on Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

   ```
   DATABASE_URL=your-postgres-connection-string
   SESSION_SECRET=your-random-secret-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

### 6. Deploy to Vercel

#### Using Vercel CLI:

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Using GitHub Integration:

1. Push your code to GitHub
2. Import the repository in Vercel dashboard
3. Vercel will automatically deploy on every push

### 7. Run Database Migrations on Vercel

After deployment, you'll need to run database migrations. You can do this by:

1. Adding a `postinstall` script to your `package.json`:

```json
{
  "scripts": {
    "postinstall": "npm run db:push || true"
  }
}
```

Or manually run migrations using Vercel CLI:

```bash
vercel env pull .env.production
npm run db:push
```

## Important Notes

### Authentication

The application currently works without authentication. If you want to enable Replit Auth:

1. Set environment variables:
   ```
   REPLIT_DOMAINS=your-domain.repl.co
   REPL_ID=your-repl-id
   ISSUER_URL=https://replit.com/oidc
   ```

2. The auth system will automatically activate when these variables are present.

### Session Storage

Sessions are stored in PostgreSQL. Make sure your database is accessible from your deployment environment.

### Wishlist Feature

Wishlists are stored by sessionId for anonymous users. When a user generates gift recommendations:
1. A sessionId is created
2. The sessionId is stored in localStorage
3. Wishlist items are associated with that sessionId

## Troubleshooting

### Database Connection Issues

If you see `DATABASE_URL must be set` error:
- Verify your `.env` file has the correct `DATABASE_URL`
- Make sure the database server is running
- Check that the connection string is valid

### Build Errors on Vercel

- Make sure all dependencies are in `dependencies`, not `devDependencies`
- Verify your Node.js version matches locally and on Vercel
- Check Vercel build logs for specific errors

### Session Errors

If you see session-related errors:
- Verify `SESSION_SECRET` is set
- Make sure the `sessions` table exists in your database
- Run `npm run db:push` to create missing tables

## Performance Optimization

For production deployments:

1. Enable caching for static assets
2. Use a CDN for images
3. Optimize database queries with indexes
4. Consider using Redis for session storage in high-traffic scenarios

## Monitoring

Consider adding:
- Error tracking (Sentry, LogRocket)
- Analytics (Google Analytics, Plausible)
- Performance monitoring (Vercel Analytics)

## Support

For issues or questions:
- Check the console logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure database migrations have run successfully
