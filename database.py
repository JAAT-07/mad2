"""Database initialization and utilities for Placement Portal Application."""
import sqlite3
import os
from config import Config


def get_db_path():
    instance_path = os.path.dirname(Config.DATABASE_PATH)
    if not os.path.exists(instance_path):
        os.makedirs(instance_path)
    upload_path = Config.UPLOAD_FOLDER
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    return Config.DATABASE_PATH


def get_connection():


    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Admin table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Company table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS company (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            hr_contact TEXT NOT NULL,
            email TEXT NOT NULL,
            website TEXT,
            address TEXT,
            approval_status TEXT DEFAULT 'Pending',
            is_blacklisted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Student table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS student (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            contact TEXT,
            cgpa REAL,
            department TEXT,
            graduation_year INTEGER,
            resume_path TEXT,
            is_blacklisted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Placement Drive table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS placement_drive (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            job_title TEXT NOT NULL,
            job_description TEXT,
            eligibility_criteria TEXT,
            application_deadline DATE,
            status TEXT DEFAULT 'Pending',
            package_offered TEXT,
            location TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES company(id)
        )
    ''')

    # Application table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS application (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            drive_id INTEGER NOT NULL,
            application_date DATE DEFAULT CURRENT_DATE,
            status TEXT DEFAULT 'Applied',
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, drive_id),
            FOREIGN KEY (student_id) REFERENCES student(id),
            FOREIGN KEY (drive_id) REFERENCES placement_drive(id)
        )
    ''')

    
    cursor.execute('SELECT COUNT(*) FROM admin')
    if cursor.fetchone()[0] == 0:
        from werkzeug.security import generate_password_hash
        cursor.execute('''
            INSERT INTO admin (username, password_hash, email)
            VALUES (?, ?, ?)
        ''', ('admin', generate_password_hash('admin123'), 'admin@institute.edu'))

    conn.commit()
    conn.close()


def query_one(sql, params=()):
    """Execute query and return one row as dict."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def query_all(sql, params=()):
    """Execute query and return all rows as list of dicts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def execute(sql, params=()):
    """Execute insert/update/delete and return last row id."""
    conn = get_connection()
    cursor = conn.cursor()         
    cursor.execute(sql, params)
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id


def execute_many(sql, params_list):
    """Execute multiple statements."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executemany(sql, params_list)
    conn.commit()
    conn.close()
