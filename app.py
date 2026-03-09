"""Placement Portal - Flask API + VueJS UI.

Flask serves JSON APIs. VueJS (CDN) handles all UI. Single Jinja template for SPA entry.
"""
import os
import json
from datetime import datetime
from functools import wraps

import redis
from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from config import Config
from database import init_db, query_one, query_all, execute, get_db_path
from tasks import export_student_applications_csv

app = Flask(__name__, static_folder="static")
app.config.from_object(Config)

with app.app_context():
    init_db()


def to_json_serializable(obj):
    """Convert db dict values for JSON (e.g. datetime, date)."""
    if obj is None:
        return None
    if isinstance(obj, (list, tuple)):
        return [to_json_serializable(x) for x in obj]
    if isinstance(obj, dict):
        return {k: to_json_serializable(v) for k, v in obj.items()}
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    return obj


# Optional Redis client for caching
redis_client = None
try:
    redis_client = redis.Redis.from_url(app.config["REDIS_URL"], decode_responses=True)
    redis_client.ping()
except Exception:
    redis_client = None


def cache_get(key):
    if not redis_client:
        return None
    value = redis_client.get(key)
    if value is None:
        return None
    try:
        return json.loads(value)
    except Exception:
        return None


def cache_set(key, value, ttl_seconds=60):
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception:
        pass


def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if "user_id" not in session or "role" not in session:
                return jsonify({"error": "Please log in."}), 401
            if role and session.get("role") != role:
                return jsonify({"error": "Permission denied."}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def admin_required(f):
    return login_required("admin")(f)


def company_required(f):
    return login_required("company")(f)


def student_required(f):
    return login_required("student")(f)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in {"pdf", "doc", "docx"}


# ============= Favicon (avoid 404 in logs) =============
@app.route("/favicon.ico")
def favicon():
    return "", 204


# ============= SPA ENTRY (Jinja only for this - per requirements) =============
@app.route("/")
def index():
    """Serve Vue SPA entry. Jinja used only for this entry point."""
    return render_template("index.html")


# ============= AUTH API =============
@app.route("/api/auth/me")
def api_auth_me():
    """Current user info."""
    if "user_id" not in session:
        return jsonify({"user": None})
    return jsonify({
        "user": {
            "id": session["user_id"],
            "username": session.get("username"),
            "role": session.get("role"),
        }
    })


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password", "")
    role = data.get("role", "student")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    if role == "admin":
        admin = query_one("SELECT * FROM admin WHERE username = ?", (username,))
        if admin and check_password_hash(admin["password_hash"], password):
            session["user_id"] = admin["id"]
            session["role"] = "admin"
            session["username"] = admin["username"]
            return jsonify({"success": True, "role": "admin"})
    elif role == "company":
        company = query_one("SELECT * FROM company WHERE username = ?", (username,))
        if company:
            if company["is_blacklisted"]:
                return jsonify({"error": "Your account has been blacklisted. Contact admin."}), 403
            if company["approval_status"] != "Approved":
                return jsonify({"error": "Your company registration is pending approval."}), 403
            if check_password_hash(company["password_hash"], password):
                session["user_id"] = company["id"]
                session["role"] = "company"
                session["username"] = company["company_name"]
                return jsonify({"success": True, "role": "company"})
    else:
        student = query_one("SELECT * FROM student WHERE username = ?", (username,))
        if student:
            if student["is_blacklisted"]:
                return jsonify({"error": "Your account has been blacklisted. Contact admin."}), 403
            if check_password_hash(student["password_hash"], password):
                session["user_id"] = student["id"]
                session["role"] = "student"
                session["username"] = student["full_name"]
                return jsonify({"success": True, "role": "student"})

    return jsonify({"error": "Invalid credentials."}), 401


@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/auth/register/company", methods=["POST"])
def api_register_company():
    data = request.get_json() or {}
    company_name = (data.get("company_name") or "").strip()
    username = (data.get("username") or "").strip()
    password = data.get("password", "")
    hr_contact = (data.get("hr_contact") or "").strip()
    email = (data.get("email") or "").strip()
    website = (data.get("website") or "").strip()
    address = (data.get("address") or "").strip()

    if not all([company_name, username, password, hr_contact, email]):
        return jsonify({"error": "All required fields must be filled."}), 400

    existing = query_one("SELECT id FROM company WHERE username = ?", (username,))
    if existing:
        return jsonify({"error": "Username already exists."}), 400

    execute(
        """INSERT INTO company (company_name, username, password_hash, hr_contact, email, website, address)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (company_name, username, generate_password_hash(password), hr_contact, email, website, address),
    )
    return jsonify({"success": True, "message": "Registration successful. Wait for admin approval to log in."})


@app.route("/api/auth/register/student", methods=["POST"])
def api_register_student():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password", "")
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip()
    contact = (data.get("contact") or "").strip()
    cgpa = data.get("cgpa")
    department = (data.get("department") or "").strip()
    graduation_year = data.get("graduation_year")

    if not all([username, password, full_name, email, cgpa, department, graduation_year]):
        return jsonify({"error": "Username, password, full name, email, CGPA, department and graduation year are required."}), 400

    existing = query_one("SELECT id FROM student WHERE username = ?", (username,))
    if existing:
        return jsonify({"error": "Username already exists."}), 400

    execute(
        """INSERT INTO student (username, password_hash, full_name, email, contact, cgpa, department, graduation_year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (username, generate_password_hash(password), full_name, email, contact, cgpa, department, graduation_year),
    )
    return jsonify({"success": True, "message": "Registration successful! You can now log in."})


# ============= ADMIN API =============
@app.route("/api/admin/dashboard")
@admin_required
def api_admin_dashboard():
    cache_key = "admin:dashboard:stats"
    stats = cache_get(cache_key)
    if not stats:
        stats = {
            "students": query_one("SELECT COUNT(*) as c FROM student")["c"],
            "companies": query_one("SELECT COUNT(*) as c FROM company")["c"],
            "drives": query_one("SELECT COUNT(*) as c FROM placement_drive")["c"],
            "applications": query_one("SELECT COUNT(*) as c FROM application")["c"],
        }
        cache_set(cache_key, stats, ttl_seconds=60)
    return jsonify(stats)


@app.route("/api/admin/companies")
@admin_required
def api_admin_companies():
    search = request.args.get("search", "").strip()
    sql = """SELECT c.*, (SELECT COUNT(*) FROM placement_drive WHERE company_id = c.id) AS drive_count
             FROM company c"""
    params = []
    if search:
        sql += " WHERE c.company_name LIKE ? OR c.id = ?"
        params = [f"%{search}%", search]
    sql += " ORDER BY c.created_at DESC"
    companies = query_all(sql, params)
    return jsonify(to_json_serializable(companies))


@app.route("/api/admin/company/<int:company_id>/approve", methods=["POST"])
@admin_required
def api_admin_approve_company(company_id):
    execute("UPDATE company SET approval_status = ? WHERE id = ?", ("Approved", company_id))
    return jsonify({"success": True})


@app.route("/api/admin/company/<int:company_id>/reject", methods=["POST"])
@admin_required
def api_admin_reject_company(company_id):
    execute("UPDATE company SET approval_status = ? WHERE id = ?", ("Rejected", company_id))
    return jsonify({"success": True})


@app.route("/api/admin/company/<int:company_id>/blacklist", methods=["POST"])
@admin_required
def api_admin_blacklist_company(company_id):
    execute("UPDATE company SET is_blacklisted = 1 WHERE id = ?", (company_id,))
    return jsonify({"success": True})


@app.route("/api/admin/company/<int:company_id>/unblacklist", methods=["POST"])
@admin_required
def api_admin_unblacklist_company(company_id):
    execute("UPDATE company SET is_blacklisted = 0 WHERE id = ?", (company_id,))
    return jsonify({"success": True})


@app.route("/api/admin/company/<int:company_id>/delete", methods=["POST"])
@admin_required
def api_admin_delete_company(company_id):
    execute("DELETE FROM application WHERE drive_id IN (SELECT id FROM placement_drive WHERE company_id = ?)", (company_id,))
    execute("DELETE FROM placement_drive WHERE company_id = ?", (company_id,))
    execute("DELETE FROM company WHERE id = ?", (company_id,))
    return jsonify({"success": True})


@app.route("/api/admin/students")
@admin_required
def api_admin_students():
    search = request.args.get("search", "").strip()
    if search:
        students = query_all(
            """SELECT s.*, (SELECT COUNT(*) FROM application WHERE student_id = s.id) as app_count
               FROM student s WHERE s.full_name LIKE ? OR s.username LIKE ? OR s.email LIKE ? OR s.contact LIKE ? OR s.id = ?
               ORDER BY s.created_at DESC""",
            (f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", search if str(search).isdigit() else -1),
        )
    else:
        students = query_all(
            """SELECT s.*, (SELECT COUNT(*) FROM application WHERE student_id = s.id) as app_count
               FROM student s ORDER BY s.created_at DESC"""
        )
    return jsonify(to_json_serializable(students))


@app.route("/api/admin/student/<int:student_id>/blacklist", methods=["POST"])
@admin_required
def api_admin_blacklist_student(student_id):
    execute("UPDATE student SET is_blacklisted = 1 WHERE id = ?", (student_id,))
    return jsonify({"success": True})


@app.route("/api/admin/student/<int:student_id>/unblacklist", methods=["POST"])
@admin_required
def api_admin_unblacklist_student(student_id):
    execute("UPDATE student SET is_blacklisted = 0 WHERE id = ?", (student_id,))
    return jsonify({"success": True})


@app.route("/api/admin/student/<int:student_id>/delete", methods=["POST"])
@admin_required
def api_admin_delete_student(student_id):
    execute("DELETE FROM application WHERE student_id = ?", (student_id,))
    execute("DELETE FROM student WHERE id = ?", (student_id,))
    return jsonify({"success": True})


@app.route("/api/admin/drives")
@admin_required
def api_admin_drives():
    drives = query_all(
        """SELECT pd.*, c.company_name FROM placement_drive pd
           JOIN company c ON pd.company_id = c.id ORDER BY pd.created_at DESC"""
    )
    return jsonify(to_json_serializable(drives))


@app.route("/api/admin/drive/<int:drive_id>/approve", methods=["POST"])
@admin_required
def api_admin_approve_drive(drive_id):
    execute("UPDATE placement_drive SET status = ? WHERE id = ?", ("Approved", drive_id))
    return jsonify({"success": True})


@app.route("/api/admin/drive/<int:drive_id>/reject", methods=["POST"])
@admin_required
def api_admin_reject_drive(drive_id):
    execute("UPDATE placement_drive SET status = ? WHERE id = ?", ("Rejected", drive_id))
    return jsonify({"success": True})


@app.route("/api/admin/drive/<int:drive_id>/delete", methods=["POST"])
@admin_required
def api_admin_delete_drive(drive_id):
    execute("DELETE FROM application WHERE drive_id = ?", (drive_id,))
    execute("DELETE FROM placement_drive WHERE id = ?", (drive_id,))
    return jsonify({"success": True})


@app.route("/api/admin/applications")
@admin_required
def api_admin_applications():
    applications = query_all(
        """SELECT a.*, s.full_name as student_name, s.email as student_email,
                  pd.job_title, c.company_name
           FROM application a JOIN student s ON a.student_id = s.id
           JOIN placement_drive pd ON a.drive_id = pd.id
           JOIN company c ON pd.company_id = c.id ORDER BY a.created_at DESC"""
    )
    return jsonify(to_json_serializable(applications))


# ============= COMPANY API =============
@app.route("/api/company/dashboard")
@company_required
def api_company_dashboard():
    company = query_one("SELECT * FROM company WHERE id = ?", (session["user_id"],))
    drives = query_all(
        """SELECT pd.*, (SELECT COUNT(*) FROM application WHERE drive_id = pd.id) as applicant_count
           FROM placement_drive pd WHERE pd.company_id = ? ORDER BY pd.created_at DESC""",
        (session["user_id"],),
    )
    return jsonify({"company": to_json_serializable(company), "drives": to_json_serializable(drives)})


@app.route("/api/company/profile", methods=["GET", "POST"])
@company_required
def api_company_profile():
    company = query_one("SELECT * FROM company WHERE id = ?", (session["user_id"],))
    if request.method == "POST":
        data = request.get_json() or {}
        company_name = (data.get("company_name") or "").strip()
        hr_contact = (data.get("hr_contact") or "").strip()
        email = (data.get("email") or "").strip()
        website = (data.get("website") or "").strip()
        address = (data.get("address") or "").strip()
        password = data.get("password", "")

        if password:
            execute(
                """UPDATE company SET company_name=?, hr_contact=?, email=?, website=?, address=?, password_hash=? WHERE id=?""",
                (company_name, hr_contact, email, website, address, generate_password_hash(password), session["user_id"]),
            )
        else:
            execute(
                """UPDATE company SET company_name=?, hr_contact=?, email=?, website=?, address=? WHERE id=?""",
                (company_name, hr_contact, email, website, address, session["user_id"]),
            )
        return jsonify({"success": True})
    return jsonify(to_json_serializable(company))


@app.route("/api/company/drives")
@company_required
def api_company_drives():
    company = query_one("SELECT approval_status FROM company WHERE id = ?", (session["user_id"],))
    drives = query_all(
        """SELECT pd.*, (SELECT COUNT(*) FROM application WHERE drive_id = pd.id) as applicant_count
           FROM placement_drive pd WHERE pd.company_id = ? ORDER BY pd.created_at DESC""",
        (session["user_id"],),
    )
    return jsonify({"drives": to_json_serializable(drives), "can_create": company["approval_status"] == "Approved"})


@app.route("/api/company/drive", methods=["POST"])
@company_required
def api_company_create_drive():
    company = query_one("SELECT * FROM company WHERE id = ?", (session["user_id"],))
    if company["approval_status"] != "Approved":
        return jsonify({"error": "Your company must be approved to create placement drives."}), 403

    data = request.get_json() or {}
    job_title = (data.get("job_title") or "").strip()
    if not job_title:
        return jsonify({"error": "Job title is required."}), 400

    execute(
        """INSERT INTO placement_drive (company_id, job_title, job_description, eligibility_criteria,
           application_deadline, package_offered, location, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')""",
        (
            session["user_id"],
            job_title,
            (data.get("job_description") or "").strip(),
            (data.get("eligibility_criteria") or "").strip(),
            data.get("application_deadline") or None,
            (data.get("package_offered") or "").strip(),
            (data.get("location") or "").strip(),
        ),
    )
    return jsonify({"success": True})


@app.route("/api/company/drive/<int:drive_id>", methods=["GET", "PUT"])
@company_required
def api_company_drive(drive_id):
    drive = query_one("SELECT * FROM placement_drive WHERE id = ? AND company_id = ?", (drive_id, session["user_id"]))
    if not drive:
        return jsonify({"error": "Drive not found."}), 404

    if request.method == "PUT":
        if drive["status"] == "Closed":
            return jsonify({"error": "Cannot edit a closed drive."}), 400
        data = request.get_json() or {}
        job_title = (data.get("job_title") or "").strip()
        if not job_title:
            return jsonify({"error": "Job title is required."}), 400

        execute(
            """UPDATE placement_drive SET job_title=?, job_description=?, eligibility_criteria=?,
               application_deadline=?, package_offered=?, location=? WHERE id=?""",
            (
                job_title,
                (data.get("job_description") or "").strip(),
                (data.get("eligibility_criteria") or "").strip(),
                data.get("application_deadline") or None,
                (data.get("package_offered") or "").strip(),
                (data.get("location") or "").strip(),
                drive_id,
            ),
        )
        return jsonify({"success": True})

    return jsonify(to_json_serializable(drive))


@app.route("/api/company/drive/<int:drive_id>/close", methods=["POST"])
@company_required
def api_company_close_drive(drive_id):
    drive = query_one("SELECT * FROM placement_drive WHERE id = ? AND company_id = ?", (drive_id, session["user_id"]))
    if drive:
        execute("UPDATE placement_drive SET status = ? WHERE id = ?", ("Closed", drive_id))
    return jsonify({"success": True})


@app.route("/api/company/drive/<int:drive_id>/delete", methods=["POST"])
@company_required
def api_company_delete_drive(drive_id):
    drive = query_one("SELECT * FROM placement_drive WHERE id = ? AND company_id = ?", (drive_id, session["user_id"]))
    if drive and drive["status"] == "Pending":
        execute("DELETE FROM application WHERE drive_id = ?", (drive_id,))
        execute("DELETE FROM placement_drive WHERE id = ?", (drive_id,))
    return jsonify({"success": True})


@app.route("/api/company/drive/<int:drive_id>/applications")
@company_required
def api_company_drive_applications(drive_id):
    drive = query_one(
        """SELECT pd.*, c.company_name FROM placement_drive pd JOIN company c ON pd.company_id = c.id
           WHERE pd.id = ? AND pd.company_id = ?""",
        (drive_id, session["user_id"]),
    )
    if not drive:
        return jsonify({"error": "Drive not found."}), 404

    applications = query_all(
        """SELECT a.*, s.full_name, s.email, s.contact, s.cgpa, s.department, s.graduation_year, s.resume_path
           FROM application a JOIN student s ON a.student_id = s.id WHERE a.drive_id = ? ORDER BY a.application_date DESC""",
        (drive_id,),
    )
    return jsonify({"drive": to_json_serializable(drive), "applications": to_json_serializable(applications)})


@app.route("/api/company/application/<int:app_id>/resume")
@company_required
def api_company_view_resume(app_id):
    application = query_one(
        """SELECT a.*, pd.company_id, s.resume_path FROM application a
           JOIN placement_drive pd ON a.drive_id = pd.id JOIN student s ON a.student_id = s.id WHERE a.id = ?""",
        (app_id,),
    )
    if application and application["company_id"] == session["user_id"] and application["resume_path"]:
        return send_from_directory(app.config["UPLOAD_FOLDER"], application["resume_path"], as_attachment=True)
    return jsonify({"error": "Resume not available."}), 404


@app.route("/api/company/application/<int:app_id>/status", methods=["POST"])
@company_required
def api_company_update_application_status(app_id):
    application = query_one(
        "SELECT a.*, pd.company_id FROM application a JOIN placement_drive pd ON a.drive_id = pd.id WHERE a.id = ?",
        (app_id,),
    )
    if application and application["company_id"] == session["user_id"]:
        data = request.get_json() or {}
        status = data.get("status")
        if status in ("Applied", "Shortlisted", "Selected", "Rejected"):
            execute("UPDATE application SET status = ? WHERE id = ?", (status, app_id))
    return jsonify({"success": True})


# ============= STUDENT API =============
@app.route("/api/student/dashboard")
@student_required
def api_student_dashboard():
    cache_key = f"student:{session['user_id']}:dashboard:drives"
    all_drives = cache_get(cache_key)
    if not all_drives:
        all_drives = query_all(
            """SELECT pd.*, c.company_name FROM placement_drive pd JOIN company c ON pd.company_id = c.id
               WHERE pd.status = 'Approved' AND c.is_blacklisted = 0
               AND (pd.application_deadline IS NULL OR pd.application_deadline >= date('now'))
               ORDER BY pd.application_deadline ASC"""
        )
        cache_set(cache_key, all_drives, ttl_seconds=60)

    applications = query_all(
        """SELECT a.drive_id, a.status, pd.job_title, c.company_name
           FROM application a JOIN placement_drive pd ON a.drive_id = pd.id
           JOIN company c ON pd.company_id = c.id WHERE a.student_id = ?""",
        (session["user_id"],),
    )
    applied_ids = {a["drive_id"] for a in applications}
    available_drives = [d for d in all_drives if d["id"] not in applied_ids]
    return jsonify({
        "available_drives": to_json_serializable(available_drives),
        "applied_drives": to_json_serializable(applications),
    })


@app.route("/api/student/profile", methods=["GET", "POST"])
@student_required
def api_student_profile():
    student = query_one("SELECT * FROM student WHERE id = ?", (session["user_id"],))
    if request.method == "POST":
        if request.is_json:
            data = request.get_json() or {}
        else:
            data = request.form

        def get_val(key, default=""):
            v = data.get(key, default)
            return v.strip() if isinstance(v, str) else v

        full_name = get_val("full_name")
        email = get_val("email")
        contact = get_val("contact")
        cgpa = data.get("cgpa") or None
        department = get_val("department")
        graduation_year = data.get("graduation_year") or None
        password = data.get("password", "")

        resume_path = student["resume_path"]
        if "resume" in request.files:
            file = request.files["resume"]
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(f"{session['user_id']}_{file.filename}")
                filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                file.save(filepath)
                resume_path = filename

        if password:
            execute(
                """UPDATE student SET full_name=?, email=?, contact=?, cgpa=?, department=?, graduation_year=?, resume_path=?, password_hash=? WHERE id=?""",
                (full_name, email, contact, cgpa, department, graduation_year, resume_path, generate_password_hash(password), session["user_id"]),
            )
        else:
            execute(
                """UPDATE student SET full_name=?, email=?, contact=?, cgpa=?, department=?, graduation_year=?, resume_path=? WHERE id=?""",
                (full_name, email, contact, cgpa, department, graduation_year, resume_path, session["user_id"]),
            )
        return jsonify({"success": True})

    return jsonify(to_json_serializable(student))


@app.route("/api/student/resume/<path:filename>")
@student_required
def api_student_resume(filename):
    if not filename.startswith(f"{session['user_id']}_"):
        return jsonify({"error": "Access denied."}), 403
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename, as_attachment=True)


@app.route("/api/student/drives")
@student_required
def api_student_drives():
    drives = query_all(
        """SELECT pd.*, c.company_name FROM placement_drive pd JOIN company c ON pd.company_id = c.id
           WHERE pd.status = 'Approved' AND c.is_blacklisted = 0
           AND (pd.application_deadline IS NULL OR pd.application_deadline >= date('now'))
           ORDER BY pd.application_deadline ASC"""
    )
    applied = {r["drive_id"]: r["status"] for r in query_all("SELECT drive_id, status FROM application WHERE student_id = ?", (session["user_id"],))}
    return jsonify({"drives": to_json_serializable(drives), "applied": applied})


@app.route("/api/student/drive/<int:drive_id>/apply", methods=["POST"])
@student_required
def api_student_apply(drive_id):
    existing = query_one("SELECT id FROM application WHERE student_id = ? AND drive_id = ?", (session["user_id"], drive_id))
    if existing:
        return jsonify({"error": "You have already applied for this drive."}), 400

    drive = query_one("SELECT * FROM placement_drive WHERE id = ? AND status = ?", (drive_id, "Approved"))
    if not drive:
        return jsonify({"error": "Drive not found or not open for applications."}), 404
    if drive["application_deadline"] and str(drive["application_deadline"]) < str(datetime.now().date()):
        return jsonify({"error": "Application deadline has passed."}), 400

    execute("INSERT INTO application (student_id, drive_id, status) VALUES (?, ?, ?)", (session["user_id"], drive_id, "Applied"))
    return jsonify({"success": True})


@app.route("/api/student/applications")
@student_required
def api_student_applications():
    applications = query_all(
        """SELECT a.*, pd.job_title, pd.company_id, c.company_name
           FROM application a JOIN placement_drive pd ON a.drive_id = pd.id
           JOIN company c ON pd.company_id = c.id WHERE a.student_id = ?
           ORDER BY a.application_date DESC""",
        (session["user_id"],),
    )
    exports_dir = os.path.join(os.path.dirname(get_db_path()), "exports")
    export_prefix = f"applications_student_{session['user_id']}_"
    export_files = []
    try:
        if os.path.isdir(exports_dir):
            export_files = [f for f in os.listdir(exports_dir) if f.startswith(export_prefix) and f.lower().endswith(".csv")]
            export_files.sort(reverse=True)
    except Exception:
        pass

    return jsonify({
        "applications": to_json_serializable(applications),
        "export_files": export_files[:10],
    })


@app.route("/api/student/applications/export", methods=["POST"])
@student_required
def api_student_export_applications():
    try:
        export_student_applications_csv.delay(session["user_id"])
        return jsonify({
            "success": True,
            "message": "Your export has been queued. You will receive an email when it is ready.",
            "filename": None,
        })
    except Exception:
        # Fallback when Redis/Celery not running: export synchronously
        filename = export_student_applications_csv(session["user_id"])
        return jsonify({
            "success": True,
            "message": "Export complete. Your CSV is ready for download.",
            "filename": filename,
        })


@app.route("/api/student/exports/<path:filename>")
@student_required
def api_student_download_export(filename):
    expected_prefix = f"applications_student_{session['user_id']}_"
    if not (filename.startswith(expected_prefix) and filename.lower().endswith(".csv")):
        return jsonify({"error": "Access denied."}), 403
    exports_dir = os.path.join(os.path.dirname(get_db_path()), "exports")
    return send_from_directory(exports_dir, filename, as_attachment=True)


@app.route("/api/student/history")
@student_required
def api_student_history():
    placements = query_all(
        """SELECT a.*, pd.job_title, c.company_name, pd.package_offered, pd.location
           FROM application a JOIN placement_drive pd ON a.drive_id = pd.id
           JOIN company c ON pd.company_id = c.id
           WHERE a.student_id = ? AND a.status = 'Selected' ORDER BY a.application_date DESC""",
        (session["user_id"],),
    )
    return jsonify(to_json_serializable(placements))


# SPA catch-all: serve index.html for Vue routes (/login, /dashboard, etc.)
@app.route("/<path:path>")
def serve_spa(path):
    if path.startswith("api/") or path.startswith("static/"):
        return jsonify({"error": "Not found"}), 404
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
