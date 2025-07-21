# Cloudflare Deployment Guide

This guide provides step-by-step instructions for deploying Xavia OTA to Cloudflare Workers with D1 database and R2 storage, including environment-specific configurations.

## Prerequisites

- Cloudflare account
- Node.js 18+ installed locally
- Git repository (GitHub/GitLab) for your project

## Environment Overview

Xavia OTA supports three distinct environments:

- **Local**: Local development environment with local SQLite database (runs locally only, not deployed to Cloudflare Workers)
- **Develop**: Development/staging environment with separate D1/R2 resources
- **Production**: Production environment with dedicated D1/R2 resources

## Project Configuration

### Project Prefix Configuration

You can customize the project prefix used in Cloudflare Workers project names and URLs. The default prefix is `env`, but you can change it to any value you prefer.

**URL Pattern**: `https://livewire-xavia-ota-{environment}.livewire-so.workers.dev`

**Examples**:
- Default: `https://livewire-xavia-ota-dev.livewire-so.workers.dev`

### Environment Configuration

Each environment uses separate configuration files with environment-specific settings. The project names in `wrangler.toml` files are static and will be automatically updated during deployment by the GitHub Actions workflow.

## Environment-Specific Configuration

### Environment Configuration Files

Each environment uses separate configuration files:

#### Wrangler Configuration Files
- `wrangler.jsonc`: Local development configuration (local execution only)
- `wrangler.dev.jsonc`: Development environment configuration
- `wrangler.prod.jsonc`: Production environment configuration

#### Environment Variable Files
- `.dev.vars`: Local development variables
- `.dev.vars.dev`: Development environment variables
- `.dev.vars.prod`: Production environment variables

### Environment-Specific Resource Configuration

#### Local Environment (Local Development Only)
```jsonc
// wrangler.jsonc
{
  "name": "livewire-xavia-ota-local",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "livewire-xavia-ota-local-db",  // Uses local SQLite
      "database_id": "local"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "livewire-xavia-ota-local-storage"
    }
  ],
  "vars": {
    "NODE_ENV": "development",
    "LOG_LEVEL": "debug",
    "ADMIN_PASSWORD": "YOUR_ADMIN_PASSWORD"
  }
}
```

**Note**: Local environment uses local SQLite database and local storage, and is not deployed to Cloudflare Workers.

#### Develop Environment
```jsonc
// wrangler.dev.jsonc
{
  "name": "livewire-xavia-ota-dev",  // Static name, updated during deployment
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "livewire-xavia-ota-dev-db",
      "database_id": "$DEV_D1_DATABASE_ID"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "livewire-xavia-ota-dev-storage"
    }
  ],
  "vars": {
    "NODE_ENV": "development",
    "LOG_LEVEL": "debug",
    "ANALYTICS_ENABLED": "false",
    "ADMIN_PASSWORD": "YOUR_ADMIN_PASSWORD"
  }
}
```

#### Production Environment
```jsonc
// wrangler.prod.jsonc
{
  "name": "livewire-xavia-ota-prod",  // Static name, updated during deployment
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "livewire-xavia-ota-prod-db",
      "database_id": "$PROD_D1_DATABASE_ID"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "livewire-xavia-ota-prod-storage"
    }
  ],
  "vars": {
    "NODE_ENV": "production",
    "LOG_LEVEL": "info",
    "ANALYTICS_ENABLED": "true",
    "ADMIN_PASSWORD": "YOUR_ADMIN_PASSWORD"
  }
}
```

**Important**: The project names in `wrangler.jsonc` files are static and will be automatically updated during deployment by the GitHub Actions workflow.

## Step 1: Create Cloudflare Resources

### 1.1 Create D1 Databases for Develop and Production Environments

```bash
# Login to Cloudflare
npx wrangler login

# Create databases for develop and production environments only
npx wrangler d1 create livewire-xavia-ota-dev-db
npx wrangler d1 create livewire-xavia-ota-prod-db
```

**Note**: Local environment uses local SQLite database, so no Cloudflare D1 database is needed.

### 1.2 Note the Database IDs

After creation, you'll receive output like:
```
✅ Successfully created DB 'livewire-xavia-ota-dev-db' in region EEUR
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "livewire-xavia-ota-dev-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Save each `database_id` for later use in the respective environment configurations.

### 1.3 Create Database Tables

Execute the schema for each environment:

```bash
# Local environment (uses local SQLite)
npx wrangler d1 execute livewire-xavia-ota-local-db --local --file=migrations/schema.sql

# Develop environment
npx wrangler d1 execute livewire-xavia-ota-dev-db --remote --file=migrations/schema.sql --config wrangler.dev.jsonc

# Production environment
npx wrangler d1 execute livewire-xavia-ota-prod-db --remote --file=migrations/schema.sql --config wrangler.prod.jsonc
```

## Step 2: Create R2 Buckets

### 2.1 Create R2 Buckets for Develop and Production Environments

```bash
# Create R2 buckets for develop and production environments only
npx wrangler r2 bucket create livewire-xavia-ota-dev-storage
npx wrangler r2 bucket create livewire-xavia-ota-prod-storage
```

**Note**: Local environment uses local storage, so no Cloudflare R2 bucket is needed.

### 2.2 Configure CORS (Optional)

Create `r2-cors.json`:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply CORS configuration to each bucket:

```bash
npx wrangler r2 bucket cors put livewire-xavia-ota-storage-dev --rules r2-cors.json
npx wrangler r2 bucket cors put livewire-xavia-ota-storage-prod --rules r2-cors.json
```

## Step 3: Deploy Workers

### 3.1 Initial Worker Deployment for Develop and Production Environments

```bash
# Deploy to develop environment (creates the worker if it doesn't exist)
npx wrangler deploy --config wrangler.dev.jsonc

# Deploy to production environment (creates the worker if it doesn't exist)
npx wrangler deploy --config wrangler.prod.jsonc
```

**Note**: Local environment runs locally and is not deployed to Cloudflare Workers.

## Step 4: Update Project Configuration

### 4.1 Copy Configuration Files

```bash
# Copy environment variable examples
cp .dev.vars.example .dev.vars
cp .dev.vars.example .dev.vars.dev
cp .dev.vars.example .dev.vars.prod

# Copy wrangler configuration examples
cp wrangler.jsonc.example wrangler.jsonc
cp wrangler.jsonc.example wrangler.dev.jsonc
cp wrangler.jsonc.example wrangler.prod.jsonc
```

### 4.2 Configure Environment Variables

Edit each `.dev.vars` file with environment-specific settings:

#### Local Environment (.dev.vars)
```env
# Local Environment Configuration
NODE_ENV=development
DB_TYPE=d1
BLOB_STORAGE_TYPE=r2
UPDATE_ENABLED=true
LOG_LEVEL=debug
ANALYTICS_ENABLED=false
HOST=http://localhost:8788
```

#### Develop Environment (.dev.vars.dev)
```env
# Develop Environment Configuration
NODE_ENV=development
DB_TYPE=d1
BLOB_STORAGE_TYPE=r2
UPDATE_ENABLED=true
LOG_LEVEL=debug
ANALYTICS_ENABLED=false

# Develop Environment Settings
HOST=https://livewire-xavia-ota-dev.livewire-so.workers.dev
```

#### Production Environment (.dev.vars.prod)
```env
# Production Environment Configuration
NODE_ENV=production
DB_TYPE=d1
BLOB_STORAGE_TYPE=r2
UPDATE_ENABLED=true
LOG_LEVEL=info
ANALYTICS_ENABLED=true

# Project Configuration
# Production Environment Settings
HOST=https://livewire-xavia-ota-prod.livewire-so.workers.dev
```

### 4.3 Update Wrangler Configuration Files

Update each `wrangler.jsonc` file with the appropriate database IDs and bucket names from the previous steps.

**Important**: The project names in `wrangler.jsonc` files are static and will be automatically updated during deployment by the GitHub Actions workflow.

## Step 5: Environment-Specific Commands

### 5.1 Local Development (Local Execution Only)

```bash
# Start local development server (runs locally only)
npm run preview
```

**Note**: Local environment is for development and testing only. It runs on your local machine and is not deployed to Cloudflare Workers.

### 5.2 Dev, Prod Environment

```bash
# Preview develop environment
npm run preview -- --config wrangler.dev.jsonc
or 
npm run preview -- --config wrangler.prod.jsonc 

# Deploy to develop environment
npm run deploy -- --config wrangler.dev.jsonc
or
npm run deploy -- --config wrangler.prod.jsonc
```

## Step 6: GitHub Actions Configuration

### 6.1 Required GitHub Secrets

Add the following secrets to your GitHub repository settings (`Settings > Secrets and variables > Actions`):

#### Core Cloudflare Secrets
1. **CLOUDFLARE_API_TOKEN**: Cloudflare API token
2. **CLOUDFLARE_ACCOUNT_ID**: Cloudflare account ID

### 6.2 Optional GitHub Variables

Add the following variables to your GitHub repository settings (`Settings > Secrets and variables > Actions > Variables`):

1. Additional environment-specific variables as needed

### 6.3 Environment URLs

- **Local**: `http://localhost:8787` (local development only)
- **Develop**: `https://livewire-xavia-ota-dev.livewire-so.workers.dev`
- **Production**: `https://livewire-xavia-ota-prod.livewire-so.workers.dev`

## Step 7: Deploy to Cloudflare Workers

### 7.1 Automated Deployment via GitHub Actions

The GitHub Actions workflow provides manual deployment control for develop and production environments:

#### Workflow Configuration
- **Trigger**: Manual workflow dispatch with environment selection
- **Environments**: `prod` (production) and `dev` (development)
- **Node.js Version**: 22

#### Deployment Process
1. **Build Phase**:
   - Installs dependencies with `npm ci`
   - Builds Next.js application with `npm run build`
   - Builds for Cloudflare Workers with `npm run workers:build`
   - Uploads build artifacts for deployment phase

2. **Deployment Phase**:
   - Downloads build artifacts
   - Updates wrangler configuration for target environment
   - Runs D1 database migrations
   - Deploys to Cloudflare Workers with environment-specific settings

#### Manual Deployment Commands
```bash
# Deploy to production environment
gh workflow run deploy.yml -f environment=prod

# Deploy to development environment  
gh workflow run deploy.yml -f environment=dev
```

#### Environment URLs
- **Develop**: `https://livewire-xavia-ota-dev.livewire-so.workers.dev`
- **Production**: `https://livewire-xavia-ota-prod.livewire-so.workers.dev`

**Note**: Local environment is not deployed via GitHub Actions as it runs locally only.

## Step 8: Configure Worker Bindings

Bindings are automatically configured through the wrangler configuration files. No manual configuration in the dashboard is needed for Workers.

1. **D1 Bindings**: Configured in wrangler.jsonc files under `d1_databases`
2. **R2 Bindings**: Configured in wrangler.jsonc files under `r2_buckets`
3. **Environment Variables**: Set in wrangler.jsonc files under `vars` section

The bindings are applied automatically when you deploy using `wrangler deploy`.

## Step 9: Verify Deployment

### 9.1 Check Deployment Status

```bash
# List your Workers
npx wrangler list

# Get deployment details and logs for each environment
npx wrangler tail livewire-xavia-ota-dev
npx wrangler tail livewire-xavia-ota-prod
```

### 9.2 Test Endpoints

Test your API endpoints for each environment:

```bash
# Test develop environment
curl https://livewire-xavia-ota-dev.livewire-so.workers.dev/api/manifest
curl https://livewire-xavia-ota-dev.livewire-so.workers.dev/api/releases

# Test production environment
curl https://livewire-xavia-ota-prod.livewire-so.workers.dev/api/manifest
curl https://livewire-xavia-ota-prod.livewire-so.workers.dev/api/releases
```

## Step 10: Environment-Specific Configuration

### 10.1 Custom Domains (Optional)

For each environment, you can set up custom domains:

1. Go to your Worker in Cloudflare Dashboard > Triggers > Custom Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### 10.2 Environment-Specific Variables

Set environment-specific variables in your wrangler configuration files or Cloudflare Dashboard for each worker:

**Develop Environment**:
```
DB_TYPE=d1
BLOB_STORAGE_TYPE=r2
UPDATE_ENABLED=true
NODE_ENV=development
LOG_LEVEL=debug
ANALYTICS_ENABLED=false
```

**Production Environment**:
```
DB_TYPE=d1
BLOB_STORAGE_TYPE=r2
UPDATE_ENABLED=true
NODE_ENV=production
LOG_LEVEL=info
ANALYTICS_ENABLED=true
```

## Database Migrations

### Environment-Specific Migrations

Run migrations for each environment:

```bash
# Local environment
wrangler d1 execute livewire-xavia-ota-db-local --local --file=migrations/schema.sql

# Develop environment
wrangler d1 execute livewire-xavia-ota-db-dev --remote --file=migrations/schema.sql --config wrangler.dev.jsonc

# Production environment
wrangler d1 execute livewire-xavia-ota-db-prod --remote --file=migrations/schema.sql --config wrangler.prod.jsonc
```

### Adding New Migrations

1. Create migration file (e.g., `migration-v2.sql`)
2. Apply to each environment:
   ```bash
   # Local
   wrangler d1 execute livewire-xavia-ota-db-local --local --file=migration-v2.sql
   
   # Develop
   wrangler d1 execute livewire-xavia-ota-db-dev --remote --file=migration-v2.sql --config wrangler.dev.jsonc
   
   # Production
   wrangler d1 execute livewire-xavia-ota-db-prod --remote --file=migration-v2.sql --config wrangler.prod.jsonc
   ```

## Environment Configuration Validation

Verify each environment's configuration:

```bash
# Local environment
npx wrangler dev --dry-run

# Develop environment
npx wrangler dev --config wrangler.dev.jsonc --dry-run

# Production environment
npx wrangler dev --config wrangler.prod.jsonc --dry-run
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check logs for each environment
   npx wrangler tail livewire-xavia-ota-dev
   npx wrangler tail livewire-xavia-ota-prod
   ```

2. **D1 Connection Issues**
   - Ensure database binding name matches (`DB`)
   - Verify database_id in respective wrangler.jsonc files
   - Check API token permissions

3. **R2 Access Issues**
   - Check R2 binding name matches (`R2`)
   - Verify bucket exists and is accessible
   - Confirm bucket names match configuration

4. **Edge Runtime Errors**
   - Ensure all API routes use edge-compatible APIs
   - Check for Node.js-specific modules

5. **Environment Variable Loading Issues**
   - Verify `.dev.vars` files are in the correct location
   - Check file format and syntax
   - Ensure environment-specific files are properly named

6. **Project Configuration Issues**
   - Verify project names are set correctly in all configuration files
   - Check GitHub repository variables if using GitHub Actions
   - Ensure project names match the expected pattern

### Debug Commands

```bash
# Environment variable verification
npx wrangler pages dev --config wrangler.jsonc --env local

# Database status check for each environment
npx wrangler d1 execute livewire-xavia-ota-db-local --local --command="SELECT name FROM sqlite_master WHERE type='table';"
npx wrangler d1 execute livewire-xavia-ota-db-dev --remote --command="SELECT name FROM sqlite_master WHERE type='table';" --config wrangler.dev.jsonc
npx wrangler d1 execute livewire-xavia-ota-db-prod --remote --command="SELECT name FROM sqlite_master WHERE type='table';" --config wrangler.prod.jsonc

# R2 bucket contents for each environment
npx wrangler r2 object list livewire-xavia-ota-storage-dev
npx wrangler r2 object list livewire-xavia-ota-storage-prod

# Worker logs for each environment
npx wrangler tail livewire-xavia-ota-dev
npx wrangler tail livewire-xavia-ota-prod
```

## Maintenance

### Database Backups

1. **D1 Backup for Each Environment**
   ```bash
   wrangler d1 backup create livewire-xavia-ota-db-dev
   wrangler d1 backup create livewire-xavia-ota-db-prod
   wrangler d1 backup list livewire-xavia-ota-db-dev
   wrangler d1 backup list livewire-xavia-ota-db-prod
   ```

2. **R2 Backup**
   - Use R2's built-in versioning
   - Or sync to another bucket for each environment

### Environment Monitoring

- Monitor usage metrics for each environment in Cloudflare Dashboard
- Set up alerts for approaching limits
- Track deployment success rates for each environment

## Cost Considerations

### Free Tier Limits (Per Environment)
- **Workers**: 100,000 requests/day, 10ms CPU time per request
- **D1**: 5GB storage, 5M rows read/day
- **R2**: 10GB storage, 1M Class A operations/month

### Monitoring Usage
- Check Cloudflare Dashboard for usage metrics per environment
- Set up alerts for approaching limits
- Consider resource sharing strategies for cost optimization

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [Next.js on Cloudflare Workers](https://developers.cloudflare.com/workers/examples/nextjs/)