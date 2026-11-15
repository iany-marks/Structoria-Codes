import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from app import create_app


class AuthenticationApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temporary_directory.name) / "structoria.sqlite3"
        self.sent_emails = []
        with patch("app.load_model", return_value={}):
            app = create_app(
                database_path=self.database_path,
                mailer=lambda email, name, token: self.sent_emails.append((email, name, token)),
            )
        app.config["TESTING"] = True
        self.client = app.test_client()

    def tearDown(self):
        self.temporary_directory.cleanup()

    def create_account(self):
        response = self.client.post(
            "/api/auth/signup",
            json={"name": "Student Example", "email": "student@example.com", "password": "safe-password"},
        )
        self.assertEqual(response.status_code, 201, response.get_json())
        self.assertEqual(len(self.sent_emails), 1)
        return self.sent_emails[0][2]

    def test_account_must_verify_email_before_login(self):
        token = self.create_account()

        response = self.client.post(
            "/api/auth/login",
            json={"email": "student@example.com", "password": "safe-password"},
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json()["code"], "email_not_verified")

        response = self.client.post("/api/auth/verify", json={"token": token})
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            "/api/auth/login",
            json={"email": "student@example.com", "password": "safe-password"},
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertIn("token", response.get_json())

    def test_session_profile_visit_and_logout_are_server_backed(self):
        token = self.create_account()
        self.client.post("/api/auth/verify", json={"token": token})
        login = self.client.post(
            "/api/auth/login",
            json={"email": "student@example.com", "password": "safe-password"},
        )
        auth_headers = {"Authorization": f'Bearer {login.get_json()["token"]}'}

        response = self.client.get("/api/auth/me", headers=auth_headers)
        self.assertEqual(response.get_json()["user"]["name"], "Student Example")

        response = self.client.patch(
            "/api/auth/profile",
            headers=auth_headers,
            json={"name": "Updated Student", "emailUpdates": False},
        )
        self.assertEqual(response.get_json()["user"]["name"], "Updated Student")

        response = self.client.post("/api/visits", json={"page": "/#courses"}, headers=auth_headers)
        self.assertEqual(response.status_code, 204)
        with closing(sqlite3.connect(self.database_path)) as connection:
            visit = connection.execute("SELECT student_id, page FROM visits").fetchone()
        self.assertIsNotNone(visit[0])
        self.assertEqual(visit[1], "/#courses")

        response = self.client.post("/api/auth/logout", headers=auth_headers)
        self.assertEqual(response.status_code, 200)
        response = self.client.get("/api/auth/me", headers=auth_headers)
        self.assertEqual(response.status_code, 401)

    def test_expired_or_invalid_verification_token_is_rejected(self):
        response = self.client.post("/api/auth/verify", json={"token": "not-a-token"})
        self.assertEqual(response.status_code, 400)

    def test_column_engine_rejects_unauthenticated_requests(self):
        response = self.client.post("/api/calculate/rc-column", json={"inputs": {}})
        self.assertEqual(response.status_code, 401)

    def test_backend_serves_the_site_and_frontend_assets(self):
        with self.client.get("/") as response:
            self.assertEqual(response.status_code, 200)
        with self.client.get("/script.js") as response:
            self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
