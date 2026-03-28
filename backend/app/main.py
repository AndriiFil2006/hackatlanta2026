import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from fastapi import FastAPI

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

app = FastAPI()

def test_connection():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return result.scalar()

@app.get("/")
def root():
    return {"message": "API is running"}

@app.get("/test-db")
def test_db():
    try:
        return {"status": "success", "result": test_connection()}
    except Exception as e:
        return {"status": "error", "message": str(e)}