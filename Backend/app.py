"""Flask API and local web server for Structoria."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from contextlib import contextmanager
from functools import wraps
import hashlib
import os
from pathlib import Path
import re
import secrets
import smtplib
import sqlite3
from email.message import EmailMessage
from urllib.parse import urlencode

from flask import Flask, current_app, jsonify, request, send_from_directory
from dotenv import load_dotenv
from werkzeug.security import check_password_hash, generate_password_hash

from column_design.calculator import calculate, load_model
from column_design.formula_engine import FormulaError
from slab_design.calculator import calculate as calculate_slab, load_model as load_slab_model


BACKEND_DIR = Path(__file__).resolve().parent
WEB_ROOT = BACKEND_DIR.parent
DEFAULT_DATABASE = BACKEND_DIR / "data" / "structoria.sqlite3"
load_dotenv(BACKEND_DIR / ".env")


def utc_now():
    return datetime.now(timezone.utc)


def timestamp(value):
    return value.isoformat(timespec="seconds")


def create_app(model_path=None, database_path=None, mailer=None, slab_model_path=None):
    app = Flask(__name__)
    app.config.update(
        MAX_CONTENT_LENGTH=128 * 1024,
        DATABASE=str(database_path or os.environ.get("STRUCTORIA_DATABASE", DEFAULT_DATABASE)),
        PUBLIC_BASE_URL=os.environ.get("PUBLIC_BASE_URL", "http://127.0.0.1:5000").rstrip("/"),
        SMTP_HOST=os.environ.get("SMTP_HOST", ""),
        SMTP_PORT=int(os.environ.get("SMTP_PORT", "587")),
        SMTP_USER=os.environ.get("SMTP_USER", ""),
        SMTP_PASSWORD=os.environ.get("SMTP_PASSWORD", ""),
        SMTP_FROM=os.environ.get("SMTP_FROM", ""),
        SMTP_USE_TLS=os.environ.get("SMTP_USE_TLS", "true").lower() == "true",
        SESSION_HOURS=12,
        REMEMBERED_SESSION_DAYS=30,
    )
    try:
        model = load_model(model_path)
        model_error = None
    except (OSError, ValueError) as error:
        model = None
        model_error = str(error)
        app.logger.error("Column design model is unavailable: %s", error)
    try:
        slab_model = load_slab_model(slab_model_path)
        slab_model_error = None
    except (OSError, ValueError) as error:
        slab_model = None
        slab_model_error = str(error)
        app.logger.error("Slab design model is unavailable: %s", error)

    @contextmanager
    def connect_db():
        connection = sqlite3.connect(current_app.config["DATABASE"])
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def initialize_database():
        database = Path(app.config["DATABASE"])
        database.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(database) as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS students (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    password_hash TEXT NOT NULL,
                    email_updates INTEGER NOT NULL DEFAULT 1,
                    email_verified_at TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS email_verifications (
                    student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
                    token_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                    expires_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS visits (
                    id INTEGER PRIMARY KEY,
                    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
                    page TEXT NOT NULL,
                    visited_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS visits_visited_at_idx ON visits(visited_at);
                CREATE INDEX IF NOT EXISTS visits_student_id_idx ON visits(student_id);
                """
            )

    initialize_database()

    def send_verification_email(email, name, token):
        if mailer:
            mailer(email, name, token)
            return
        if not app.config["SMTP_HOST"] or not app.config["SMTP_FROM"]:
            raise RuntimeError("Email delivery is not configured. Set SMTP_HOST and SMTP_FROM.")

        link = f'{app.config["PUBLIC_BASE_URL"]}/?{urlencode({"verify": token})}'
        message = EmailMessage()
        message["Subject"] = "Verify your Structoria account"
        message["From"] = app.config["SMTP_FROM"]
        message["To"] = email
        message.set_content(
            f"Hello {name},\n\n"
            f"Verify your Structoria account by opening this link within 24 hours:\n{link}\n\n"
            "If you did not create this account, you can ignore this email."
        )
        with smtplib.SMTP(app.config["SMTP_HOST"], app.config["SMTP_PORT"], timeout=15) as server:
            if app.config["SMTP_USE_TLS"]:
                server.starttls()
            if app.config["SMTP_USER"]:
                server.login(app.config["SMTP_USER"], app.config["SMTP_PASSWORD"])
            server.send_message(message)

    def api_error(message, status):
        return jsonify(error=message), status

    def new_token():
        token = secrets.token_urlsafe(32)
        return token, hashlib.sha256(token.encode("utf-8")).hexdigest()

    def session_student():
        authorization = request.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return None
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        now = timestamp(utc_now())
        with connect_db() as connection:
            row = connection.execute(
                """
                SELECT students.id, students.name, students.email, students.email_updates
                FROM sessions
                JOIN students ON students.id = sessions.student_id
                WHERE sessions.token_hash = ? AND sessions.expires_at > ?
                    AND students.email_verified_at IS NOT NULL
                """,
                (token_hash, now),
            ).fetchone()
        return dict(row) if row else None

    def require_auth(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            student = session_student()
            if not student:
                return api_error("Please sign in with a verified account.", 401)
            request.student = student
            return handler(*args, **kwargs)

        return wrapped

    @app.get("/")
    def home():
        return send_from_directory(WEB_ROOT, "index.html")

    @app.get("/<path:filename>")
    def frontend_file(filename):
        if filename.startswith("api/"):
            return api_error("Not found.", 404)
        return send_from_directory(WEB_ROOT, filename)

    @app.get("/api/health")
    def health():
        return jsonify(
            status="ready",
            calculationEngine="Structoria Eurocode 2 model evaluator",
            columnCalculator="ready" if model is not None else "unavailable",
            slabCalculator="ready" if slab_model is not None else "unavailable",
        )

    @app.post("/api/auth/signup")
    def signup():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return api_error("Send a JSON object with your name, email and password.", 400)
        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip().lower()
        password = payload.get("password")
        email_updates = payload.get("emailUpdates", True)
        if not name or len(name) > 120:
            return api_error("Enter a name between 1 and 120 characters.", 400)
        if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            return api_error("Enter a valid email address.", 400)
        if not isinstance(password, str) or len(password) < 8 or len(password) > 1024:
            return api_error("Use a password with at least 8 characters.", 400)
        if not isinstance(email_updates, bool):
            return api_error("The email-updates preference must be true or false.", 400)

        token, token_hash = new_token()
        try:
            with connect_db() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO students (name, email, password_hash, email_updates, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (name, email, generate_password_hash(password), int(email_updates), timestamp(utc_now())),
                )
                connection.execute(
                    "INSERT INTO email_verifications (student_id, token_hash, expires_at) VALUES (?, ?, ?)",
                    (cursor.lastrowid, token_hash, timestamp(utc_now() + timedelta(hours=24))),
                )
        except sqlite3.IntegrityError:
            return api_error("An account with this email already exists. Try signing in or resending the verification email.", 409)

        try:
            send_verification_email(email, name, token)
        except Exception:
            current_app.logger.exception("Could not send account verification email to %s", email)
            return jsonify(
                error="Your account was saved, but the verification email could not be sent. Check the email server settings and request a new verification email.",
                code="email_delivery_failed",
            ), 503
        return jsonify(message="Account created. Check your email for a verification link."), 201

    @app.post("/api/auth/verify")
    def verify_email():
        payload = request.get_json(silent=True)
        token = payload.get("token") if isinstance(payload, dict) else None
        if not isinstance(token, str) or not token:
            return api_error("The verification link is invalid or expired.", 400)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        now = timestamp(utc_now())
        with connect_db() as connection:
            verification = connection.execute(
                "SELECT student_id FROM email_verifications WHERE token_hash = ? AND expires_at > ?",
                (token_hash, now),
            ).fetchone()
            if not verification:
                return api_error("The verification link is invalid or expired. Request a new one and try again.", 400)
            connection.execute(
                "UPDATE students SET email_verified_at = ? WHERE id = ?",
                (now, verification["student_id"]),
            )
            connection.execute("DELETE FROM email_verifications WHERE student_id = ?", (verification["student_id"],))
        return jsonify(message="Email verified. You can now sign in.")

    @app.post("/api/auth/resend-verification")
    def resend_verification():
        payload = request.get_json(silent=True)
        email = str(payload.get("email", "")).strip().lower() if isinstance(payload, dict) else ""
        if not email:
            return api_error("Enter your email address.", 400)
        token, token_hash = new_token()
        with connect_db() as connection:
            student = connection.execute(
                "SELECT id, name, email, email_verified_at FROM students WHERE email = ?",
                (email,),
            ).fetchone()
            if not student or student["email_verified_at"]:
                return jsonify(message="If an unverified account exists for that address, a new link has been sent.")
            connection.execute(
                """
                INSERT INTO email_verifications (student_id, token_hash, expires_at)
                VALUES (?, ?, ?)
                ON CONFLICT(student_id) DO UPDATE SET token_hash = excluded.token_hash, expires_at = excluded.expires_at
                """,
                (student["id"], token_hash, timestamp(utc_now() + timedelta(hours=24))),
            )
        try:
            send_verification_email(student["email"], student["name"], token)
        except Exception:
            current_app.logger.exception("Could not resend account verification email to %s", email)
            return jsonify(
                error="The verification email could not be sent. Check the email server settings and try again.",
                code="email_delivery_failed",
            ), 503
        return jsonify(message="If an unverified account exists for that address, a new link has been sent.")

    @app.post("/api/auth/login")
    def login():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return api_error("Enter your email address and password.", 400)
        email = str(payload.get("email", "")).strip().lower()
        password = payload.get("password")
        if not isinstance(password, str) or len(password) > 1024:
            return api_error("Email or password is incorrect.", 401)
        with connect_db() as connection:
            student = connection.execute(
                "SELECT id, name, email, password_hash, email_updates, email_verified_at FROM students WHERE email = ?",
                (email,),
            ).fetchone()
            if not student or not isinstance(password, str) or not check_password_hash(student["password_hash"], password):
                return api_error("Email or password is incorrect.", 401)
            if not student["email_verified_at"]:
                return jsonify(error="Verify your email before signing in.", code="email_not_verified"), 403
            token, token_hash = new_token()
            duration = timedelta(days=app.config["REMEMBERED_SESSION_DAYS"]) if payload.get("remember") else timedelta(hours=app.config["SESSION_HOURS"])
            connection.execute(
                "INSERT INTO sessions (token_hash, student_id, expires_at) VALUES (?, ?, ?)",
                (token_hash, student["id"], timestamp(utc_now() + duration)),
            )
        return jsonify(
            token=token,
            user={
                "name": student["name"],
                "email": student["email"],
                "emailUpdates": bool(student["email_updates"]),
            },
        )

    @app.get("/api/auth/me")
    @require_auth
    def current_student():
        student = request.student
        return jsonify(user={
            "name": student["name"],
            "email": student["email"],
            "emailUpdates": bool(student["email_updates"]),
        })

    @app.post("/api/auth/logout")
    @require_auth
    def logout():
        authorization = request.headers.get("Authorization", "")
        token = authorization.partition(" ")[2]
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with connect_db() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
        return jsonify(message="Signed out.")

    @app.patch("/api/auth/profile")
    @require_auth
    def update_profile():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return api_error("Send profile changes as a JSON object.", 400)
        name = str(payload.get("name", "")).strip()
        if not name or len(name) > 120:
            return api_error("Enter a name between 1 and 120 characters.", 400)
        email_updates = payload.get("emailUpdates", True)
        if not isinstance(email_updates, bool):
            return api_error("The email-updates preference must be true or false.", 400)
        new_password = payload.get("newPassword", "")
        with connect_db() as connection:
            if new_password:
                student = connection.execute(
                    "SELECT password_hash FROM students WHERE id = ?",
                    (request.student["id"],),
                ).fetchone()
                current_password = payload.get("currentPassword", "")
                if not isinstance(current_password, str) or not check_password_hash(student["password_hash"], current_password):
                    return api_error("Your current password is incorrect.", 400)
                if not isinstance(new_password, str) or len(new_password) < 8 or len(new_password) > 1024:
                    return api_error("Use a new password with at least 8 characters.", 400)
                connection.execute(
                    "UPDATE students SET name = ?, email_updates = ?, password_hash = ? WHERE id = ?",
                    (name, int(email_updates), generate_password_hash(new_password), request.student["id"]),
                )
            else:
                connection.execute(
                    "UPDATE students SET name = ?, email_updates = ? WHERE id = ?",
                    (name, int(email_updates), request.student["id"]),
                )
        return jsonify(user={
            "name": name,
            "email": request.student["email"],
            "emailUpdates": email_updates,
        })

    @app.post("/api/visits")
    def record_visit():
        payload = request.get_json(silent=True)
        page = payload.get("page", "/") if isinstance(payload, dict) else "/"
        if not isinstance(page, str) or not page.startswith("/") or len(page) > 300:
            return api_error("The page path is invalid.", 400)
        student = session_student()
        with connect_db() as connection:
            connection.execute(
                "INSERT INTO visits (student_id, page, visited_at) VALUES (?, ?, ?)",
                (student["id"] if student else None, page, timestamp(utc_now())),
            )
        return "", 204

    @app.post("/api/calculate/rc-column")
    @require_auth
    def calculate_rc_column():
        if model is None:
            return jsonify(
                error="The column design model is unavailable on this server.",
                detail=model_error,
            ), 503
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="Send a JSON object with column design inputs."), 400
        inputs = payload.get("inputs", payload)
        title_block = payload.get("titleBlock", {})
        try:
            return jsonify(calculate(model, inputs, title_block))
        except FormulaError as error:
            app.logger.exception("Column design formula evaluation failed")
            return jsonify(error="The calculation model could not evaluate this design.", detail=str(error)), 422
        except ValueError as error:
            return jsonify(error=str(error)), 400

    @app.post("/api/calculate/rc-slab")
    @require_auth
    def calculate_rc_slab():
        if slab_model is None:
            return jsonify(
                error="The slab design model is unavailable on this server.",
                detail=slab_model_error,
            ), 503
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="Send a JSON object with slab design inputs."), 400
        slab_type = payload.get("slabType")
        inputs = payload.get("inputs")
        title_block = payload.get("titleBlock", {})
        if not isinstance(slab_type, str):
            return jsonify(error="'slabType' must be a supported slab design type."), 400
        if not isinstance(inputs, dict):
            return jsonify(error="'inputs' must be a JSON object of slab design inputs."), 400
        if title_block is not None and not isinstance(title_block, dict):
            return jsonify(error="'titleBlock' must be a JSON object when provided."), 400
        try:
            return jsonify(calculate_slab(
                slab_model,
                slab_type,
                inputs,
                title_block,
            ))
        except FormulaError as error:
            app.logger.exception("Slab design formula evaluation failed")
            return jsonify(error="The calculation model could not evaluate this design.", detail=str(error)), 422
        except ValueError as error:
            return jsonify(error=str(error)), 400

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
