# Docker & Docker Compose Setup Guide

## Quick Start with Docker Compose

The easiest way to get the entire application running with database and API in one command.

### Prerequisites
- Docker: https://www.docker.com/products/docker-desktop
- Docker Compose: Usually comes with Docker Desktop

### Step 1: Verify Docker Installation

```bash
docker --version
docker-compose --version
```

### Step 2: Start Everything

From the project root directory:

```bash
docker-compose up
```

Or to run in background:

```bash
docker-compose up -d
```

### Step 3: Verify Services Are Running

```bash
# Check running containers
docker-compose ps

# Should show:
# NAME              STATUS
# market_backend    Up (healthy)
# market_db         Up (healthy)
```

### Step 4: Access the Application

- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **API Base URL**: http://localhost:8000
- **Database**: postgres://market_user:market_password@localhost:5432/market_db

## Common Docker Compose Commands

```bash
# View logs
docker-compose logs -f backend

# View database logs
docker-compose logs -f db

# Stop services
docker-compose down

# Stop and remove volumes (clean database)
docker-compose down -v

# Rebuild images after code changes
docker-compose build

# Rebuild and start
docker-compose up --build

# Run migrations (if needed)
docker-compose exec backend python -m alembic upgrade head

# Access database directly
docker-compose exec db psql -U market_user -d market_db
```

## Manual Docker Commands

If you prefer to run Docker without Compose:

### Build the Backend Image

```bash
cd backend
docker build -t market-backend:latest .
```

### Run PostgreSQL

```bash
docker run -d \
  --name market_db \
  -e POSTGRES_USER=market_user \
  -e POSTGRES_PASSWORD=market_password \
  -e POSTGRES_DB=market_db \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine
```

### Initialize Database

```bash
# Wait a few seconds for DB to start, then:
docker exec market_db psql -U market_user -d market_db -f /path/to/schema.sql
```

### Run Backend

```bash
docker run -d \
  --name market_backend \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://market_user:market_password@market_db:5432/market_db \
  -e SECRET_KEY=your-secret-key \
  --link market_db:db \
  market-backend:latest
```

## Troubleshooting

### Issue: Port Already in Use

If port 8000 or 5432 is already in use:

```bash
# Change ports in docker-compose.yml
# Then restart:
docker-compose down
docker-compose up
```

Or use different ports:

```bash
docker run -p 8001:8000 market-backend:latest
docker run -p 5433:5432 postgres:15-alpine
```

### Issue: Container Keeps Restarting

```bash
# Check logs
docker-compose logs backend

# Common causes:
# - Database not initialized
# - Invalid DATABASE_URL
# - Missing SECRET_KEY
```

### Issue: Cannot Connect to Database

```bash
# Verify network connectivity
docker-compose exec backend ping db

# Check database is accepting connections
docker-compose exec db psql -U market_user -c "SELECT 1;"
```

### Issue: Database Connection Refused

```bash
# Wait longer for database to initialize
sleep 10
docker-compose exec db psql -U market_user -d market_db -f ../database/schema.sql
```

## Production Deployment

### Create .env file for Production

```bash
# In docker-compose.yml directory
cat > .env << EOF
SECRET_KEY=your-very-secure-random-key-change-this
DATABASE_USER=market_user
DATABASE_PASSWORD=super-secure-password
DATABASE_URL=postgresql://market_user:super-secure-password@db:5432/market_db
DEBUG=False
EOF
```

### Optimize docker-compose.yml for Production

```yaml
# Set restart policy
services:
  backend:
    restart: unless-stopped
    # Add health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    restart: unless-stopped
    # Add backups
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
```

### Run Production Containers

```bash
# Start services with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

## Development Workflow

### Hot Reload Development

The Docker setup supports hot reload:

1. Edit files in `backend/app/`
2. Changes are automatically reflected
3. Server restarts automatically (uvicorn --reload)

### Using Docker with IDE

**VS Code:**
```json
{
  "python.defaultInterpreterPath": "/usr/local/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.python"
  }
}
```

### Database Access from IDE

Connect your database IDE to:
- **Host**: localhost
- **Port**: 5432
- **User**: market_user
- **Password**: market_password
- **Database**: market_db

## Monitoring and Logging

### View All Logs

```bash
docker-compose logs --tail=100
```

### Follow Logs

```bash
docker-compose logs -f
```

### View Specific Service

```bash
docker-compose logs -f backend
docker-compose logs -f db
```

### Save Logs

```bash
docker-compose logs > app_logs.txt
```

## Backup and Recovery

### Backup Database

```bash
docker-compose exec db pg_dump \
  -U market_user market_db > backup.sql
```

### Restore Database

```bash
docker-compose exec -T db psql -U market_user market_db < backup.sql
```

### Backup Volume Data

```bash
docker run --volumes-from market_db \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz \
  /var/lib/postgresql/data
```

## Performance Optimization

### Limit Resource Usage

```yaml
# Add to docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
  
  db:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

### Enable Database Connection Pooling

The backend already uses connection pooling. For more optimization:

```python
# In db.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
)
```

## Cleanup

### Remove All Containers and Volumes

```bash
docker-compose down -v

# Or manually
docker container prune
docker volume prune
docker image prune
```

### Remove Specific Service

```bash
docker-compose rm backend
docker-compose rm db
```

## Next Steps

1. Access API at http://localhost:8000/docs
2. Create test data using the Swagger UI
3. Connect frontend to backend API
4. Set up CI/CD pipeline for automatic deployment
5. Configure production secrets and security

For detailed API usage, see [EXAMPLES.md](EXAMPLES.md)
