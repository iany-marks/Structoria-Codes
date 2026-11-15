# Structoria backend

The Flask service hosts the frontend and API on the same origin. It stores student accounts, email-verification tokens, sign-in sessions and site visits in a local SQLite database at `backend/data/structoria.sqlite3` by default. Override the database location with `STRUCTORIA_DATABASE`.

The framework-free frontend sends column and slab designs to the authenticated Python API; the browser no longer downloads or runs a second copy of the calculation engine. The slab workflow uses the supplied workbook's coefficient-based moment analysis and presents its checks and bar schedule as a student-facing calculation record. Hero images are resized and compressed, and only the active hero image loads initially.

## Run locally

From the `backend` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000`. Do not open `index.html` directly from disk: authentication and visit tracking require the backend.

## Configure verification email

Sign-up creates a pending account and sends a one-time email-verification link. Sign-in is refused until the link is used. Configure an SMTP sender before testing sign-up; the account is still saved if mail delivery fails, and the sign-in form can resend the email.

Create a sender address with an email provider that supports SMTP. The provider may require you to verify the sender or your domain before it can send mail. A separate mailbox is not always required; follow the provider's instructions for the allowed `SMTP_FROM` address and SMTP credentials.

Copy `.env.example` to `.env` in this directory, then fill in the values supplied by your provider:

```text
SMTP_HOST=your-provider-smtp-host
SMTP_PORT=587
SMTP_USER=your-provider-smtp-username
SMTP_PASSWORD=your-provider-smtp-password
SMTP_FROM=Structoria <no-reply@your-domain.com>
SMTP_USE_TLS=true
PUBLIC_BASE_URL=http://127.0.0.1:5000
```

`app.py` loads `Backend/.env` at startup; already-defined environment variables take precedence. Keep the real `.env` private: it is excluded by the root `.gitignore`. Start the service as described above after saving the file. For deployment, use the public HTTPS website as `PUBLIC_BASE_URL` and configure the SMTP values through the hosting platform's secret/environment-variable settings instead of uploading `.env`.

The email flow currently sends account-verification messages only. The email-updates preference does not yet send newsletters or course updates. Enable HTTPS for the deployed site and back up the SQLite database securely. The API hashes passwords, stores only hashed verification/session tokens, and returns an opaque session token to the browser.

## API

- `POST /api/auth/signup` creates a pending student account and sends verification email.
- `POST /api/auth/verify` verifies an email using the one-time token.
- `POST /api/auth/resend-verification` sends another verification link.
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` manage authenticated sessions.
- `PATCH /api/auth/profile` updates a student's name, email preferences and password.
- `POST /api/visits` records a page visit, optionally associated with a signed-in student.
- `GET /api/health` reports service and column-calculator readiness.
- `POST /api/calculate/rc-column` runs the existing column-design model for a signed-in student.
- `POST /api/calculate/rc-slab` runs one of the three supported slab workbook cases for a signed-in student: one-way solid slab, two-way panel, or simply supported two-way panel.

The calculator model is built from `assets/column-design-eurocode.xlsx` with `backend/BuildColumnDesignModel.ps1`. If that workbook/model is not present, the authentication service still starts, while the column endpoint returns HTTP 503 with the missing-model reason.

Build the sanitized slab model from the supplied workbook with:

```powershell
python .\build_slab_model.py "C:\path\to\SLAB STRUCTURAL DESIGN.xlsx"
```

The builder includes only the three calculation sheets and their coefficient data. It removes saved sample inputs, title-block cells and the workbook's read-me sheet. Keep the original workbook outside the website assets. The slab endpoint returns HTTP 503 when `assets/slab-design-model.json` is unavailable.

The source workbook uses EN 1992-1-1 (2004) with the UK National Annex for reinforced-concrete design checks, BS 8110 coefficient tables for slab moments, and BS 8666:2020 for bar schedules. The Lunia reference reports use plate-analysis moments and Wood-Armer design combinations instead. The report states this methodological difference; their moment outputs are not directly comparable. The one-way workflow asks users to confirm the continuous-span count and variation because the workbook's coefficient applicability note is not independently enforceable from its other geometry inputs.

Slab cases outside the workbook's scope include cantilevers, flat slabs and punching shear, concentrated or line loads, openings, shear reinforcement, crack-width calculations, vibration and fire design. Read the report's assumptions and limitations before using or issuing a result.

Run backend tests from `backend` with:

```powershell
python -m unittest discover -s Test
```
