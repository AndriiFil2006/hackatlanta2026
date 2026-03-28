# Backend Setup Guide

## Quick Start

### 1. Prerequisites
- Python 3.8 or higher
- PostgreSQL 12 or higher
- npm/node (for the frontend part, but not needed for backend setup)

### 2. Setup PostgreSQL Database

**For Windows:**
1. Install PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation, remember the password for the `postgres` user
3. Open pgAdmin or use Command Prompt:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE market_db;

# Connect to the new database
\c market_db

# Create a new user (optional)
CREATE USER market_user WITH PASSWORD 'market_password';
GRANT ALL PRIVILEGES ON DATABASE market_db TO market_user;
```

**For macOS:**
```bash
# Install PostgreSQL using Homebrew
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb market_db

# Connect and run schema
psql market_db < ../database/schema.sql
```

**For Linux:**
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE market_db;

# Create user
CREATE USER market_user WITH PASSWORD 'market_password';
GRANT ALL PRIVILEGES ON DATABASE market_db TO market_user;

# Exit psql
\q

# Run schema
psql -U market_user -d market_db < ../database/schema.sql
```

### 3. Setup Python Environment

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# For example:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/market_db
# or if you created a user:
# DATABASE_URL=postgresql://market_user:market_password@localhost:5432/market_db
```

### 5. Initialize Database

```bash
# Run schema script
psql -U postgres -d market_db -f ../database/schema.sql

# (Optional) Run seed data
psql -U postgres -d market_db -f ../database/seed.sql
```

### 6. Start the Server

**Option A: Using Python directly**
```bash
# Make sure venv is activated
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Option B: Using startup script (Windows)**
```bash
# PowerShell
.\run.ps1
```

**Option C: Using startup script (macOS/Linux)**
```bash
bash run.sh
```

The server will be available at: **http://localhost:8000**

### 7. Test the API

Visit the interactive API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Troubleshooting

### Issue: "psycopg2 module not found"
```bash
pip install psycopg2-binary
```

### Issue: "Cannot connect to PostgreSQL"
- Check if PostgreSQL is running:
  - Windows: Check Services or use `brew services list`
  - Mac: `brew services list`
  - Linux: `sudo systemctl status postgresql`
- Verify DATABASE_URL is correct in .env
- Check username and password

### Issue: "Address already in use" on port 8000
```bash
# Use a different port
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Issue: Permission denied on schema.sql
```bash
# Make sure you're in the backend directory or use full path
psql -U postgres -d market_db -f "C:\path\to\database\schema.sql"
```

## Development Notes

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app and routes
│   ├── db.py            # Database configuration
│   ├── auth.py          # Authentication logic
│   ├── models.py        # Pydantic models (request/response)
│   └── schemas.py       # SQLAlchemy models (database)
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
├── .env                 # Local environment (not in git)
├── run.sh              # Startup script for Linux/Mac
├── run.ps1             # Startup script for Windows
└── README.md           # Full documentation
```

### Environment Variables
```
DATABASE_URL          - PostgreSQL connection string
SECRET_KEY           - JWT secret key (change in production!)
HOST                 - Server host (default: 0.0.0.0)
PORT                 - Server port (default: 8000)
DEBUG                - Debug mode (default: True for dev)
```

### Useful Commands

```bash
# Deactivate virtual environment
deactivate

# View API docs in terminal
curl http://localhost:8000/docs

# Test database connection
curl http://localhost:8000/health

# Install new package
pip install package_name

# Update requirements file
pip freeze > requirements.txt
```

### Creating Test Data

```bash
# Register a test user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "display_name": "Test User"
  }'

# Login to get token
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Next Steps

1. Test all endpoints using Swagger UI: http://localhost:8000/docs
2. Connect the frontend to this API
3. Configure CORS if frontend is on different domain
4. Set up production database for deployment
5. Generate strong SECRET_KEY for production

Happy coding! 🚀
