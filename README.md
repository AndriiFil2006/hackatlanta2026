## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- Supabase account



## Backend Setup (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
JWT_SECRET_KEY=replace_me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Run backend:

```bash
uvicorn app.main:app --reload
```

Backend docs will be at `http://127.0.0.1:8000/docs`.

## Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173` by default.

## Fill in `.env` Values (Supabase + API Keys)

Use Supabase and Google Places to replace placeholder values in `backend/.env`.

1. In Supabase, create/open the project.
2. In **Project Settings -> Database**, copy the Postgres connection string and set it as `DATABASE_URL`.
3. Set `JWT_SECRET_KEY` to a long random secret string.

If you are initializing the DB, open Supabase **SQL Editor** and run:
- `database/schema.sql`
- `database/seed.sql` (optional)
