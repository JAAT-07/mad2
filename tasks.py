

import csv
import os
from datetime import date, datetime, timedelta
from typing import List, Dict

from celery import Celery
from celery.schedules import crontab

from config import Config
from database import query_all, get_db_path


celery = Celery(
    "placement_portal",
    broker=Config.CELERY_BROKER_URL,
    backend=Config.CELERY_RESULT_BACKEND,
)

celery.conf.timezone = "Asia/Kolkata"
celery.conf.beat_schedule = {
    "daily-deadline-reminders": {
        "task": "tasks.send_daily_deadline_reminders",
        "schedule": crontab(hour=9, minute=0),
    },
    "monthly-activity-report": {
        "task": "tasks.send_monthly_activity_report",
        "schedule": crontab(day_of_month=1, hour=9, minute=30),
    },
}


def _send_email(to_email: str, subject: str, html_body: str) -> None:
    """Very lightweight email helper."""
    if not to_email:
        return

    if not Config.MAIL_SERVER:
        print("\n=== EMAIL (SIMULATED) ===")
        print(f"TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print(html_body)
        print("=== END EMAIL ===\n")
        return

    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = Config.MAIL_SENDER
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
        if Config.MAIL_USE_TLS:
            server.starttls()
        if Config.MAIL_USERNAME and Config.MAIL_PASSWORD:
            server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
        server.sendmail(Config.MAIL_SENDER, [to_email], msg.as_string())


# @celery.task
# def send_test_email(to_email: str = None) -> str:
#     
#     target = to_email or Config.ADMIN_EMAIL
#     body = "<p>This is a test email bahi .</p>"
#     _send_email(target, "Placement Portal - Test Email", body)
#     return f"Test email sent to {target}"


@celery.task
def send_daily_deadline_reminders() -> None:
    """Send daily reminders to students about upcoming application deadlines."""
    today = date.today()
    upcoming = today + timedelta(days=1)

    drives: List[Dict] = query_all(
        """
        SELECT pd.id, pd.job_title, pd.application_deadline, c.company_name
        FROM placement_drive pd
        JOIN company c ON pd.company_id = c.id
        WHERE pd.status = 'Approved'
          AND pd.application_deadline = ?
          AND c.is_blacklisted = 0
        """,
        (upcoming.isoformat(),),
    )

    if not drives:
        return

    students: List[Dict] = query_all(
        "SELECT id, full_name, email FROM student WHERE is_blacklisted = 0"
    )

    if not students:
        return

    drive_list_html = "<ul>" + "".join(
        f"<li><strong>{d['job_title']}</strong> at {d['company_name']} "
        f"(deadline: {d['application_deadline']})</li>"
        for d in drives
    ) + "</ul>"

    for student in students:
        body = f"""
        <p>Dear {student['full_name']},</p>
        <p>The following placement drives have application deadlines tomorrow:</p>
        {drive_list_html}
        <p>Please log in to the Placement Portal and apply if you are eligible.</p>
        """
        _send_email(student["email"], "Upcoming placement drive deadlines", body)


@celery.task
def send_monthly_activity_report() -> None:
    today = date.today()
    first_of_this_month = date(today.year, today.month, 1)
    last_month_end = first_of_this_month - timedelta(days=1)
    last_month_start = date(last_month_end.year, last_month_end.month, 1)

    drives = query_all(
        """
        SELECT COUNT(*) as count
        FROM placement_drive
        WHERE DATE(created_at) BETWEEN ? AND ?
        """,
        (last_month_start.isoformat(), last_month_end.isoformat()),
    )[0]["count"]

    applications = query_all(
        """
        SELECT COUNT(*) as count
        FROM application
        WHERE DATE(created_at) BETWEEN ? AND ?
        """,
        (last_month_start.isoformat(), last_month_end.isoformat()),
    )[0]["count"]

    selected = query_all(
        """
        SELECT COUNT(*) as count
        FROM application
        WHERE status = 'Selected'
          AND DATE(created_at) BETWEEN ? AND ?
        """,
        (last_month_start.isoformat(), last_month_end.isoformat()),
    )[0]["count"]

    html_report = f"""
    <h2>Placement Activity Report - {last_month_start.strftime('%B %Y')}</h2>
    <ul>
        <li>Total placement drives created: <strong>{drives}</strong></li>
        <li>Total student applications: <strong>{applications}</strong></li>
        <li>Total students selected: <strong>{selected}</strong></li>
    </ul>
    <p>This report was generated automatically by the Placement Portal.</p>
    """

    _send_email(Config.ADMIN_EMAIL, "Monthly Placement Activity Report", html_report)


@celery.task
def export_student_applications_csv(student_id: int) -> str:
    applications: List[Dict] = query_all(
        """
        SELECT
            s.id as student_id,
            s.full_name as student_name,
            c.company_name,
            pd.job_title,
            a.status,
            a.application_date
        FROM application a
        JOIN student s ON a.student_id = s.id
        JOIN placement_drive pd ON a.drive_id = pd.id
        JOIN company c ON pd.company_id = c.id
        WHERE s.id = ?
        ORDER BY a.application_date DESC
        """,
        (student_id,),
    )

    exports_dir = os.path.join(os.path.dirname(get_db_path()), "exports")
    os.makedirs(exports_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"applications_student_{student_id}_{timestamp}.csv"
    filepath = os.path.join(exports_dir, filename)

    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["Student ID", "Student Name", "Company Name", "Drive Title", "Application Status", "Application Date"]
        )
        for row in applications:
            writer.writerow(
                [
                    row["student_id"],
                    row["student_name"],
                    row["company_name"],
                    row["job_title"],
                    row["status"],
                    row["application_date"],
                ]
            )

    student = query_all("SELECT full_name, email FROM student WHERE id = ?", (student_id,))
    if student:
        stu = student[0]
        body = f"""
        <p>Dear {stu['full_name']},</p>
        <p>Your placement application history export is ready.</p>
        <p>File name: <strong>{filename}</strong></p>
        <p>You can download it from the portal (Student > Applications).</p>
        """
        _send_email(stu["email"], "Placement applications CSV export ready", body)

    return filename
