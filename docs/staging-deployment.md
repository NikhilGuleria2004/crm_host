# Staging Deployment Guide

## Overview

This document describes how to set up and deploy the CRM application to a dedicated Vercel preview/staging environment.

## Prerequisites

- Vercel account with access to the project
- Vercel CLI installed: `npm i -g vercel`
- MongoDB Atlas cluster (or self-hosted) for staging
- Vercel Blob storage enabled for staging
- Git branch strategy (e.g., `develop` or `staging` branch)

## Environment Configuration

### 1. Vercel Project Setup

1. Import the project in the Vercel dashboard
2. Link the Git repository
3. Configure the following environments in **Project Settings → Environment Variables**:

#### Production Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `APP_ENV` | `production` | Determines environment-specific behavior |
| `NODE_ENV` | `production` | Set automatically by Vercel |
| `MONGODB_URI` | `mongodb+srv://...` | Production MongoDB Atlas URI |
| `MONGODB_DATABASE` | `crm_production` | Production database name |
| `SESSION_SECRET` | `<32+ random chars>` | Must be at least 32 characters |
| `COOKIE_DOMAIN` | `yourdomain.com` | Production domain |
| `CORS_ORIGIN` | `https://yourdomain.com` | Production frontend URL |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_...` | Vercel Blob token for production |

#### Preview/Staging Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `APP_ENV` | `preview` | Determines environment-specific behavior |
| `NODE_ENV` | `production` | Set automatically by Vercel for preview |
| `MONGODB_URI` | `mongodb+srv://...` | Staging MongoDB Atlas URI (separate from production) |
| `MONGODB_DATABASE` | `crm_staging` | Staging database name |
| `SESSION_SECRET` | `<32+ random chars>` | Must be at least 32 characters |
| `COOKIE_DOMAIN` | `.vercel.app` | Preview domain pattern |
| `CORS_ORIGIN` | `https://<branch>-<project>.vercel.app` | Preview frontend URL |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_...` | Vercel Blob token for staging |

### 2. MongoDB Setup

1. Create a separate MongoDB Atlas cluster or database for staging
2. Ensure network access allows Vercel IPs or use private endpoints
3. Run index creation script against staging database:

```bash
pnpm --filter @crm/api db:ensure-indexes
```

With `MONGODB_URI` set to the staging URI.

### 3. Vercel Blob Setup

1. Create a separate Blob store for staging in the Vercel dashboard
2. Or use the same store with different path prefixes
3. Copy the `BLOB_READ_WRITE_TOKEN` for staging

### 4. Deploy Configuration

The project uses the following Vercel configuration files:

- `apps/api/vercel.json` — API routes, cron jobs, and build settings
- `apps/web/vercel.json` — Frontend static build and routing

### 5. Branch Deployment Strategy

#### Automatic Preview Deployments

Vercel automatically creates preview deployments for pull requests. Configure in `vercel.json` or dashboard:

```json
{
  "github": {
    "enabled": true,
    "silent": false
  }
}
```

#### Manual Staging Deployment

Deploy the staging branch to the staging environment:

```bash
# Link to staging environment (first time only)
vercel link --scope your-team --project your-project --yes

# Deploy staging branch
vercel --prod --yes
```

## Running Smoke Tests

### Local Smoke Tests

Run the smoke test suite locally:

```bash
pnpm --filter @crm/api test
```

This runs all unit tests including `tests/smoke.test.ts`.

### Staging Smoke Tests

Once deployed, run smoke tests against the staging URL:

```bash
# Set the staging URL
export STAGING_URL="https://your-project-staging.vercel.app"

# Run smoke tests (requires curl or similar tool)
curl -f $STAGING_URL/health
curl -f $STAGING_URL/ready
```

### Manual Smoke Test Checklist

Verify the following endpoints on the staging environment:

| Category | Endpoint | Method | Expected |
|----------|----------|--------|----------|
| Health | `/health` | GET | 200 OK |
| Health | `/ready` | GET | 200 OK |
| Auth | `/api/v1/auth/register` | POST | 201 / 400 |
| Auth | `/api/v1/auth/login` | POST | 200 / 401 |
| Auth | `/api/v1/auth/me` | GET | 200 (with session) |
| Auth | `/api/v1/auth/logout` | POST | 200 |
| CRUD | `/api/v1/contacts` | GET | 200 |
| CRUD | `/api/v1/contacts` | POST | 201 |
| CRUD | `/api/v1/companies` | GET | 200 |
| CRUD | `/api/v1/deals` | GET | 200 |
| Import | `/api/v1/imports` | GET | 200 |
| Export | `/api/v1/exports` | GET | 200 |
| Export | `/api/v1/exports` | POST | 201 |
| Webhook | `/api/v1/webhooks` | GET | 200 |
| Webhook | `/api/v1/webhooks` | POST | 201 |
| API Key | `/api/v1/api-keys` | GET | 200 |
| API Key | `/api/v1/api-keys` | POST | 201 |
| RBAC | Various protected routes | varies | 403 without permission |
| Tenant | Cross-org resource access | varies | 404 |

## Data Isolation

- **Never use production data for staging tests**
- Use a separate staging MongoDB database
- Seed staging with test data only
- Consider automated data seeding for staging:

```bash
MONGODB_URI=<staging-uri> pnpm --filter @crm/api db:seed
```

## Cron Jobs

The staging environment uses Vercel Cron for background job processing:

- Path: `/api/cron/queue`
- Schedule: Every 5 minutes
- Configured in `apps/api/vercel.json`

## Monitoring

- Use Vercel Analytics for request monitoring
- Check Vercel Function logs for errors
- Monitor MongoDB Atlas metrics for staging database

## Troubleshooting

### Cold Start Issues

Vercel Functions may cold start. The first request after inactivity may be slower. Verify:

1. `connectDatabase()` succeeds on cold start
2. Module-level singletons initialize correctly
3. No state is assumed to persist between requests

### Environment Variables Not Loading

Ensure environment variables are set in the Vercel dashboard for the correct environment (Production, Preview, or Development).

### MongoDB Connection Failures

- Verify `MONGODB_URI` is correct for the environment
- Check MongoDB Atlas network access rules
- Ensure the database user has correct permissions
