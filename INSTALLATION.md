# Installation Guide

This guide will walk you through the process of setting up and running the NMT Release Management System on your local machine.

## Prerequisites

- Python 3.8 or higher
- Node.js 14.x or higher
- npm 6.x or higher
- Git

## Backend Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Translation
```

### 2. Set Up Python Virtual Environment

```bash
cd backend
python -m venv venv

# On Windows
venv\Scripts\activate

# On Linux/Mac
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

If your requirements.txt is missing or incomplete, make sure it includes:

```
fastapi==0.95.0
uvicorn==0.21.1
pydantic==2.0.0
sqlalchemy==2.0.9
python-jose==3.3.0
passlib==1.7.4
bcrypt==4.0.1
python-multipart==0.0.6
pandas==2.0.0
xlsxwriter==3.1.0
```

### 4. Initialize the Database

The system uses SQLite as its database. The database file will be created automatically when the application is first run, but you can initialize it with:

```bash
python test_db.py
```

This will create the database with initial test data (if the script exists).

### 5. Start the Backend Server

```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

## Frontend Setup

### 1. Install Dependencies

```bash
cd ../frontend
npm install
```

### 2. Configure API Endpoint

Ensure the API endpoint is correctly configured in `frontend/src/services/api.ts`. By default, it points to `http://localhost:8000/api/v1/`.

### 3. Start the Development Server

```bash
npm start
```

The frontend will be available at http://localhost:3000

## First Time Setup

### 1. Register an Admin User

1. Open http://localhost:3000 in your browser
2. Click on "Sign Up"
3. Fill in the registration form with the following details:
   - Role: admin
   - Username: admin
   - Email: admin@example.com
   - Password: (create a secure password)
4. The first admin user will be automatically approved

### 2. Set Up Core Data

Once logged in as an admin:

1. Create language pairs (e.g., English → Thai)
2. Create testsets for each language pair
3. Create model versions for each language pair

## Running in Production

### Backend

For production deployment, use a proper ASGI server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Consider using:
- Gunicorn as a process manager
- Nginx as a reverse proxy
- A production-grade database (PostgreSQL)

### Frontend

Build a production version of the frontend:

```bash
cd frontend
npm run build
```

Then serve the static files from the `build` directory using a web server like Nginx or Apache.

## Troubleshooting

### Database Issues

If you encounter database errors, you can reset the database by:

1. Stopping the backend server
2. Deleting the `nmt_release_management.db` file
3. Restarting the server (it will create a new database)

### API Connection Issues

If the frontend cannot connect to the backend:

1. Ensure both servers are running
2. Check that the API URL in `frontend/src/services/api.ts` is correct
3. Verify there are no CORS issues (the backend has CORS enabled by default)

### JWT Authentication Issues

If you experience authentication problems:

1. Make sure the JWT secret key is properly set in `backend/app/core/config.py`
2. Check that the token expiration time is appropriate
3. Clear browser cookies and local storage, then try logging in again 