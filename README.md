# AWS DataValidator — S3 Validation Workspace

## Project Structure

```
Frontend-TUBE/
├── aws-datavalidator/      ← React frontend (CRA)
│   └── src/
│       ├── App.js
│       ├── components/
│       │   ├── Layout.js / Layout.css
│       │   ├── TopNav.js / TopNav.css
│       │   ├── Sidebar.js / Sidebar.css
│       │   ├── ValidationWorkspace.js / .css
│       │   ├── ValidationToolbar.js / .css
│       │   ├── PDFViewer.js / .css
│       │   ├── ValidationTable.js / .css
│       │   └── ValidationFooter.js / .css
│       └── index.css
└── backend/                ← FastAPI backend
    ├── main.py
    ├── requirements.txt
    └── .env.example
```

---

## Running the Backend

```bash
cd backend

# Copy and fill in your AWS credentials
cp .env.example .env

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

## Running the Frontend

```bash
cd aws-datavalidator
npm start
```

Opens at: http://localhost:3000

---

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | /health | Health check |
| GET  | /api/validation/{document_id} | Fetch validation fields |
| POST | /api/validation/{document_id} | Save validation state |
| POST | /api/sync-s3 | Sync validated data to S3 as Excel |
| GET  | /api/export/{document_id} | Download Excel file |
| POST | /api/upload-pdf | Upload input PDF to S3 |

---

## AWS Configuration

Set these in `backend/.env`:

```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
S3_OUTPUT_PREFIX=validated/
CORS_ORIGINS=http://localhost:3000
```

Without AWS credentials, the app runs in **demo mode** — all S3 operations are simulated.
