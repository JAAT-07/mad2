# Placement Portal - VueJS + Flask API

Flask API backend with VueJS (CDN) frontend. Jinja2 used only for the SPA entry point as per requirements.

## Tech Stack

- **Flask** – API
- **VueJS** – UI (CDN)
- **Jinja2** – Entry point HTML only
- **Bootstrap** – Styling
- **SQLite** – Database
- **Redis** – Caching
- **Redis + Celery** – Batch jobs

## Setup

1. Create and activate a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate   # Windows
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

4. Open http://127.0.0.1:5000 in your browser.

## Default Credentials

- **Admin**: username `admin`, password `admin123`

## Features

- **Admin**: Approve/reject companies and placement drives, manage students and companies, search, blacklist
- **Company**: Register, create placement drives (after approval), view applications, shortlist students
- **Student**: Register, view approved drives, apply, track application status, placement history, resume upload

## Structure

```
MAD--1project-vue/
├── app.py              # Flask API
├── config.py
├── database.py
├── tasks.py
├── templates/
│   └── index.html      # Single Jinja entry (loads Vue SPA)
├── static/
│   └── js/
│       ├── api.js      # API client
│       └── app.js      # Vue app, router, components
├── instance/           # Created automatically
│   ├── placement.db
│   ├── uploads/
│   └── exports/
└── requirements.txt
```

## Celery (optional)

For CSV export and scheduled tasks:

```bash
celery -A tasks worker -l info
celery -A tasks beat -l info
```
