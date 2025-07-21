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

**URL Pattern**: `https://xavia-ota-{environment}.your-subdomain.workers.dev`

**Examples**:
- Default: `https://xavia-ota-dev.your-subdomain.workers.dev`

### Environment Configuration

Each environment uses separate configuration files with environment-specific settings. The project names in `wrangler.toml` files are static and will be automatically updated during deployment by the GitHub Actions workflow.

## Configuration Overview

### Dual Configuration Approach

This project uses different configuration approaches for local development and CI/CD deployment:

#### Local Development
- **`wrangler.jsonc`**: Direct configuration file for local development and manual deployment
- **`.dev.vars`**: Environment variables for local development

#### CI/CD Deployment (GitHub Actions)
- **`wrangler.tmpl.jsonc`**: Template file with variables (`$ENV`, `$D1_DATABASE_ID`)
- **GitHub Secrets**: Environment-specific database IDs and API tokens
- **`envsubst`**: Processes template to generate deployment configuration

### Configuration Files

#### Local Configuration Files
- `wrangler.jsonc`: Direct wrangler configuration for local development
- `.dev.vars`: Local environment variables

#### CI/CD Template Files
- `wrangler.tmpl.jsonc`: Template for GitHub Actions deployment
- `.dev.vars.dev`: Development environment variables (optional for CI/CD)
- `.dev.vars.prod`: Production environment variables (optional for CI/CD)

### Local Configuration (wrangler.jsonc)

For local development and manual deployment, the project includes a direct configuration file:

```jsonc
// wrangler.jsonc (for local development)
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "xavia-ota-local",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": [
    "nodejs_compat",
    "global_fetch_strictly_public"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "xavia-ota-local"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "xavia-ota-local-db",
      "database_id": "local"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "xavia-ota-dev-storage"
    },
    {
      "binding": "NEXT_INC_CACHE_R2_BUCKET",
      "bucket_name": "xavia-ota-dev-storage"
    }
  ]
}
```

### CI/CD Template Configuration (wrangler.tmpl.jsonc)

For GitHub Actions deployment, the project uses a template that gets processed during deployment:

```jsonc
// wrangler.tmpl.jsonc (for CI/CD deployment)
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "xavia-ota-$ENV",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": [
    "nodejs_compat",
    "global_fetch_strictly_public"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "xavia-ota-$ENV"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "xavia-ota-$ENV-db",
      "database_id": "$D1_DATABASE_ID"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "xavia-ota-$ENV-storage"
    },
    {
      "binding": "NEXT_INC_CACHE_R2_BUCKET",
      "bucket_name": "xavia-ota-$ENV-storage"
    }
  ]
}
```

**Template Variables** (CI/CD only):
- `$ENV`: Environment name (`dev` or `prod`)
- `$D1_DATABASE_ID`: Database ID for the specific environment

**Key Features**:
- **OpenNext Integration**: Uses `.open-next/worker.js` as the main entry point
- **Assets Binding**: Serves static assets from `.open-next/assets`
- **Self-Reference Service**: Allows worker to call itself for internal operations
- **Dual R2 Bindings**: One for general storage (`R2`) and one for Next.js incremental cache (`NEXT_INC_CACHE_R2_BUCKET`)

## Step 1: Create Cloudflare Resources

### 1.1 Create D1 Databases for Develop and Production Environments

```bash
# Login to Cloudflare
npx wrangler login

# Create databases for develop and production environments only
npx wrangler d1 create xavia-ota-dev-db
npx wrangler d1 create xavia-ota-prod-db
```

**Note**: Local environment uses local SQLite database, so no Cloudflare D1 database is needed.

### 1.2 Note the Database IDs

After creation, you'll receive output like:
```
✅ Successfully created DB 'xavia-ota-dev-db' in region EEUR
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "xavia-ota-dev-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Save each `database_id` for later use in the respective environment configurations.

### 1.3 Create Database Tables

Execute the schema for each environment:

```bash
# Local environment (uses local SQLite)
npx wrangler d1 execute xavia-ota-local-db --local --file=migrations/schema.sql

# Develop environment
npx wrangler d1 execute xavia-ota-dev-db --remote --file=migrations/schema.sql --config wrangler.dev.jsonc

# Production environment
npx wrangler d1 execute xavia-ota-prod-db --remote --file=migrations/schema.sql --config wrangler.prod.jsonc
```

## Step 2: Create R2 Buckets

### 2.1 Create R2 Buckets for Develop and Production Environments

```bash
# Create R2 buckets for develop and production environments only
npx wrangler r2 bucket create xavia-ota-dev-storage
npx wrangler r2 bucket create xavia-ota-prod-storage
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
npx wrangler r2 bucket cors put xavia-ota-storage-dev --rules r2-cors.json
npx wrangler r2 bucket cors put xavia-ota-storage-prod --rules r2-cors.json
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

### 4.1 Configuration Setup

#### For Local Development

The project already includes these files for local development:
- `wrangler.jsonc`: Ready-to-use local configuration
- `.dev.vars`: Local environment variables

#### For CI/CD Deployment Only

```bash
# Only needed if you want separate environment variable files for CI/CD
cp .dev.vars.example .dev.vars.dev  # Optional
cp .dev.vars.example .dev.vars.prod # Optional
```

**Note**: 
- **Local development**: Uses existing `wrangler.jsonc` and `.dev.vars` files directly
- **CI/CD deployment**: Uses `wrangler.tmpl.jsonc` template with GitHub secrets

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
HOST=https://xavia-ota-dev.your-subdomain.workers.dev
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
HOST=https://xavia-ota-prod.your-subdomain.workers.dev
```

### 4.3 Local vs Remote Configuration

#### Local Development Configuration

For local development, update your `wrangler.jsonc` file with actual values:

1. **Update database configuration**: Replace `database_id: "local"` with your actual local D1 database ID if needed
2. **Update R2 bucket names**: Ensure R2 bucket names match your created buckets
3. **Update service name**: Ensure the service name in `services` matches the worker name

#### CI/CD Configuration (GitHub Secrets)

For automated deployment, configure the following GitHub secrets:

- `D1_DATABASE_ID_DEV`: Database ID for development environment
- `D1_DATABASE_ID_PROD`: Database ID for production environment
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token

**Template Processing**: During CI/CD deployment, GitHub Actions uses `envsubst`:
```bash
envsubst < wrangler.tmpl.jsonc > wrangler.deploy.jsonc
```

## Step 5: Local Development and Deployment

### 5.1 Local Development

```bash
# Start local development server
npm run dev

# Or use wrangler for local preview
npm run preview
```

### 5.2 Local Manual Deployment

For manual deployment from your local machine:

#### Option 1: Using existing wrangler.jsonc (Recommended for local)

```bash
# Update wrangler.jsonc with production/dev values, then deploy
npm run deploy
```

#### Option 2: Using template approach (Similar to CI/CD)

```bash
# Generate configuration for development environment
ENV=dev D1_DATABASE_ID=your-dev-db-id envsubst < wrangler.tmpl.jsonc > wrangler.deploy.jsonc
npm run deploy -- --config wrangler.deploy.jsonc

# Generate configuration for production environment
ENV=prod D1_DATABASE_ID=your-prod-db-id envsubst < wrangler.tmpl.jsonc > wrangler.deploy.jsonc
npm run deploy -- --config wrangler.deploy.jsonc
```

### 5.3 Current Local Configuration

Your current `.dev.vars` file includes:
```env
NEXTJS_ENV=development
NODE_ENV=development
HOST=http://localhost:8787
BLOB_STORAGE_TYPE=local
DB_TYPE=d1
PRIVATE_KEY_BASE_64='your-private-key-in-base-64'
ADMIN_PASSWORD=admin
```

**Recommendation**: Use GitHub Actions workflow for production deployments to ensure consistency.

## Step 6: GitHub Actions Configuration

### 6.1 Required GitHub Secrets

Add the following secrets to your GitHub repository settings (`Settings > Secrets and variables > Actions`):

#### Core Cloudflare Secrets
1. **CLOUDFLARE_API_TOKEN**: Cloudflare API token with Workers and D1 permissions
2. **CLOUDFLARE_ACCOUNT_ID**: Your Cloudflare account ID
3. **D1_DATABASE_ID_DEV**: D1 database ID for development environment
4. **D1_DATABASE_ID_PROD**: D1 database ID for production environment

### 6.2 GitHub Actions Workflow

The deployment workflow (`deploy.yml`) provides:

- **Manual Trigger**: Deploy via workflow dispatch with environment selection
- **Environment Options**: `prod` (production) and `dev` (development)
- **Node.js Version**: 22
- **Build Artifacts**: Uploads build files between jobs for deployment

### 6.3 Environment URLs

- **Local**: `http://localhost:8787` (local development only)
- **Develop**: `https://xavia-ota-dev.your-subdomain.workers.dev`
- **Production**: `https://xavia-ota-prod.your-subdomain.workers.dev`

## Step 7: Deploy to Cloudflare Workers

### 7.1 Automated Deployment via GitHub Actions

The GitHub Actions workflow provides manual deployment control for develop and production environments:

#### Workflow Configuration
- **Trigger**: Manual workflow dispatch with environment selection
- **Environments**: `prod` (production) and `dev` (development)
- **Node.js Version**: 22

#### Deployment Process
1. **Build Job** (`build`):
   - Installs dependencies with `npm ci`
   - Builds Next.js application with `npm run build`
   - Builds for Cloudflare Workers with `npm run workers:build`
   - Uploads build artifacts (`.open-next/` and `.next/`) for deployment job

2. **Deploy Job** (`deploy`):
   - Downloads build artifacts from build job
   - Generates wrangler configuration using `envsubst < wrangler.tmpl.jsonc > wrangler.deploy.jsonc`
   - Sets environment variables:
     - `ENV`: Selected environment (`dev` or `prod`)
     - `D1_DATABASE_ID`: Environment-specific database ID from secrets
   - Runs D1 database migrations: `d1 execute xavia-ota-$ENV-db --remote --file=migrations/schema.sql`
   - Deploys to Cloudflare Workers: `npm run deploy -- --config wrangler.deploy.jsonc`

#### Manual Deployment Commands
```bash
# Deploy to production environment
gh workflow run deploy.yml -f environment=prod

# Deploy to development environment  
gh workflow run deploy.yml -f environment=dev
```

#### Environment URLs
- **Develop**: `https://xavia-ota-dev.your-subdomain.workers.dev`
- **Production**: `https://xavia-ota-prod.your-subdomain.workers.dev`

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
npx wrangler tail xavia-ota-dev
npx wrangler tail xavia-ota-prod
```

### 9.2 Test Endpoints

Test your API endpoints for each environment:

```bash
# Test develop environment
curl https://xavia-ota-dev.your-subdomain.workers.dev/api/manifest
curl https://xavia-ota-dev.your-subdomain.workers.dev/api/releases

# Test production environment
curl https://xavia-ota-prod.your-subdomain.workers.dev/api/manifest
curl https://xavia-ota-prod.your-subdomain.workers.dev/api/releases
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
# Local environment (manual local setup)
wrangler d1 execute xavia-ota-local-db --local --file=migrations/schema.sql

# Development environment (done automatically by GitHub Actions)
wrangler d1 execute xavia-ota-dev-db --remote --file=migrations/schema.sql

# Production environment (done automatically by GitHub Actions)
wrangler d1 execute xavia-ota-prod-db --remote --file=migrations/schema.sql
```

### Adding New Migrations

1. Create migration file (e.g., `migration-v2.sql`)
2. Apply to each environment:
   ```bash
   # Local
   wrangler d1 execute xavia-ota-local-db --local --file=migration-v2.sql
   
   # Development (update deploy.yml to use new migration file)
   wrangler d1 execute xavia-ota-dev-db --remote --file=migration-v2.sql
   
   # Production (update deploy.yml to use new migration file)
   wrangler d1 execute xavia-ota-prod-db --remote --file=migration-v2.sql
   ```

**Note**: For deployed environments, update the migration file path in `.github/workflows/deploy.yml` to use the new migration file.

## Configuration Validation

### Local Configuration Validation

Verify your local configuration:

```bash
# Validate local wrangler.jsonc configuration
npx wrangler dev --dry-run

# Test local deployment (dry run)
npx wrangler deploy --dry-run
```

### CI/CD Template Validation

For validating CI/CD configurations:

```bash
# Generate and validate development configuration
ENV=dev D1_DATABASE_ID=your-dev-db-id envsubst < wrangler.tmpl.jsonc > temp-wrangler.jsonc
npx wrangler deploy --dry-run --config temp-wrangler.jsonc
rm temp-wrangler.jsonc

# Generate and validate production configuration
ENV=prod D1_DATABASE_ID=your-prod-db-id envsubst < wrangler.tmpl.jsonc > temp-wrangler.jsonc
npx wrangler deploy --dry-run --config temp-wrangler.jsonc
rm temp-wrangler.jsonc
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check logs for each environment
   npx wrangler tail xavia-ota-dev
   npx wrangler tail xavia-ota-prod
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
npx wrangler d1 execute xavia-ota-db-local --local --command="SELECT name FROM sqlite_master WHERE type='table';"
npx wrangler d1 execute xavia-ota-db-dev --remote --command="SELECT name FROM sqlite_master WHERE type='table';" --config wrangler.dev.jsonc
npx wrangler d1 execute xavia-ota-db-prod --remote --command="SELECT name FROM sqlite_master WHERE type='table';" --config wrangler.prod.jsonc

# R2 bucket contents for each environment
npx wrangler r2 object list xavia-ota-storage-dev
npx wrangler r2 object list xavia-ota-storage-prod

# Worker logs for each environment
npx wrangler tail xavia-ota-dev
npx wrangler tail xavia-ota-prod
```

## Maintenance

### Database Backups

1. **D1 Backup for Each Environment**
   ```bash
   wrangler d1 backup create xavia-ota-db-dev
   wrangler d1 backup create xavia-ota-db-prod
   wrangler d1 backup list xavia-ota-db-dev
   wrangler d1 backup list xavia-ota-db-prod
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