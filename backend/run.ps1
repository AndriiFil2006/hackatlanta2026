# Startup script for development (Windows PowerShell)

# Activate virtual environment
& .\venv\Scripts\Activate.ps1

# Run the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
