# 🏗️ Complete Backend Architecture & Documentation — EVERY FILE, EVERY DETAIL

> **Exhaustive technical reference** — covers **every single file**, **every function**, **every DB table column**, **every API route** across **all 20 modules** + **core** + **shared** layers.

---

## 📌 Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Complete Directory Tree](#2-complete-directory-tree)
3. [Entry Point — main.py](#3-entry-point--mainpy)
4. [Core Layer](#4-core-layer)
   - [4.1 config.py](#41-configpy)
   - [4.2 database.py](#42-databasepy)
   - [4.3 langgraph_db.py](#43-langgraph_dbpy)
   - [4.4 exception.py](#44-exceptionpy)
   - [4.5 logging.py](#45-loggingpy)
   - [4.6 time.py](#46-timepy)
   - [4.7 middleware/csrf.py](#47-middlewarecsrfpy)
   - [4.8 middleware/request_logging.py](#48-middlewarerequest_loggingpy)
   - [4.9 security/jwt.py](#49-securityjwtpy)
   - [4.10 security/dependencies.py](#410-securitydependenciespy)
   - [4.11 security/encryption.py](#411-securityencryptionpy)
   - [4.12 security/hashing.py](#412-securityhashingpy)
   - [4.13 security/otp.py](#413-securityotppy)
   - [4.14 security/random.py](#414-securityrandompy)
   - [4.15 security/exception.py](#415-securityexceptionpy)
5. [Shared Layer](#5-shared-layer)
   - [5.1 celery.py](#51-celerypy)
   - [5.2 redis.py](#52-redispy)
   - [5.3 sse_stream.py](#53-sse_streampy)
   - [5.4 file_extraction.py](#54-file_extractionpy)
   - [5.5 pii_analyzer.py](#55-pii_analyzerpy)
   - [5.6 notification_signal.py](#56-notification_signalpy)
   - [5.7 db/base.py, dependencies.py, types.py](#57-db)
   - [5.8 llm/gemini.py](#58-llmgeminipy)
   - [5.9 email/ (entire sub-package)](#59-email)
6. [Module: Project](#6-module-project)
7. [Module: Auth](#7-module-auth)
8. [Module: User](#8-module-user)
9. [Module: Organization](#9-module-organization)
10. [Module: Team](#10-module-team)
11. [Module: Assessment](#11-module-assessment)
12. [Module: Assessment Attempt](#12-module-assessment-attempt)
13. [Module: Roadmap](#13-module-roadmap)
14. [Module: Roadmap Agent (LangGraph)](#14-module-roadmap-agent)
15. [Module: Doubt Solver Agent (LangGraph)](#15-module-doubt-solver-agent)
16. [Module: Thread](#16-module-thread)
17. [Module: AI Content Generation](#17-module-ai-content-generation)
18. [Module: Artifact](#18-module-artifact)
19. [Module: Roadmap Content](#19-module-roadmap-content)
20. [Module: Roadmap Snippet](#20-module-roadmap-snippet)
21. [Module: Roadmap Learning Assessment](#21-module-roadmap-learning-assessment)
22. [Module: Course Recommendation](#22-module-course-recommendation)
23. [Module: Background Jobs](#23-module-background-jobs)
24. [Module: Learning Progress](#24-module-learning-progress)
25. [Module: Audio Transcription](#25-module-audio-transcription)
26. [Module: Open Source Content Sources](#26-module-open-source-content-sources)
27. [Scripts (Seed Data)](#27-scripts-seed-data)
28. [All DB Tables & Columns (Master List)](#28-all-db-tables--columns-master-list)
29. [Complete API Route Map](#29-complete-api-route-map)

---

## 1. Technology Stack

| Technology | Purpose |
|:---|:---|
| **Python 3.12+** | Backend runtime |
| **FastAPI** | Async HTTP framework with automatic OpenAPI docs |
| **SQLAlchemy 2.0 (Async)** | ORM & database engine (`postgresql+asyncpg`) |
| **PostgreSQL** | Primary relational database |
| **Pydantic v2** | Request/response validation & serialization |
| **Celery** | Distributed background task queue |
| **Redis** | Celery broker, OTP caching, pub/sub for SSE streaming |
| **LangGraph** | Stateful AI agent orchestration (Roadmap & Doubt Solver agents) |
| **Google Gemini** | LLM provider for content generation & agents |
| **Azure Blob Storage** | JD file uploads & document storage |
| **psycopg3** | LangGraph checkpoint database driver |
| **Uvicorn** | ASGI server |

---

## 2. Complete Directory Tree

```
backend/
├── main.py                                         # FastAPI app, lifespan, route registration
├── pyproject.toml                                  # Python deps (uv/pip)
├── requirements.txt                                # Pip deps
├── .env                                            # Secrets, DB URLs, API keys
├── .env.example                                    # Template
├── exp.py                                          # Experimental scratch
│
├── core/
│   ├── config.py                                   # Pydantic Settings class
│   ├── database.py                                 # AsyncEngine + AsyncSessionLocal
│   ├── langgraph_db.py                             # psycopg3 pool for LangGraph checkpoints
│   ├── exception.py                                # AppException, BadRequestException, ForbiddenException, AgentExecutionError
│   ├── logging.py                                  # Structured logging (file + console)
│   ├── time.py                                     # get_current_timestamp()
│   ├── middleware/
│   │   ├── csrf.py                                 # CSRFMiddleware
│   │   └── request_logging.py                      # RequestLoggingMiddleware
│   └── security/
│       ├── dependencies.py                         # get_current_user(), validate_refresh_token()
│       ├── encryption.py                           # get_cipher(), AES encrypt/decrypt
│       ├── exception.py                            # InvalidToken, TokenExpired
│       ├── hashing.py                              # hash_entity(), generate_hash()
│       ├── jwt.py                                  # create_access_token(), create_refresh_token(), decode_token(), create_csrf_token()
│       ├── otp.py                                  # generate_otp(), store_otp()
│       └── random.py                               # securerandomstring()
│
├── shared/
│   ├── celery.py                                   # Celery app config (Redis broker)
│   ├── redis.py                                    # Redis client singleton
│   ├── sse_stream.py                               # SSE StreamingResponse helper
│   ├── file_extraction.py                          # extract_jd_text() – PDF/DOCX
│   ├── pii_analyzer.py                             # PII masking (Presidio)
│   ├── notification_signal.py                      # Notification dispatcher
│   ├── db/
│   │   ├── base.py                                 # class Base(DeclarativeBase)
│   │   ├── dependencies.py                         # get_db() async generator
│   │   └── types.py                                # EncryptedText, EncryptedJSON custom column types
│   ├── llm/
│   │   └── gemini.py                               # Gemini client: generate_content(), generate_content_stream()
│   └── email/
│       ├── dependencies.py                         # get_background_email_service()
│       ├── provider.py                             # SMTPEmailProvider
│       ├── schema.py                               # EmailTemplate enum, EmailPayload
│       ├── service.py                              # BackgroundEmailService.send_email()
│       ├── tempplate_loader.py                     # Jinja2 HTML loader
│       └── templates/                              # HTML email templates
│
├── scripts/
│   ├── dev-mode-running-scripts.md
│   ├── seed_user.py
│   ├── seed_role.py
│   ├── seed_permissions.py
│   └── seed_features.py
│
└── modules/
    ├── project/                    (7 files)
    ├── auth/                       (6 files)
    ├── user/                       (6 files)
    ├── organization/               (6 files)
    ├── team/                       (6 files)
    ├── assessment/                 (5 files + 2 sub-modules)
    │   ├── assessment_access/      (4 files)
    │   └── improvement_roadmap/    (4 files)
    ├── assessment_attempt/         (7 files)
    ├── roadmap/                    (8 files)
    ├── roadmap_agent/              (8 files + nodes/)
    │   └── nodes/                  (8 files + utils/)
    ├── doubt_solver_agent/         (5 files + nodes/)
    │   └── nodes/                  (3 files)
    ├── thread/                     (7 files)
    ├── ai_content_generation/      (6 files)
    ├── artifact/                   (5 files)
    ├── roadmap_content/            (3 files)
    ├── roadmap_snippet/            (5 files)
    ├── roadmap_learning_assessment/(6 files)
    ├── course_recommendation/      (7 files)
    ├── background_jobs/            (6 files)
    ├── learning_progress/          (3 files)
    ├── audio_transcription/        (2 files)
    └── opensource_content_sources/  (4 files)
```

---

## 3. Entry Point — `main.py`

📂 [`backend/main.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/main.py) — 124 lines

### What It Does

| Line Range | Action |
|:---|:---|
| 1–5 | Windows `asyncio` event loop policy fix for psycopg |
| 7–43 | Import all 20 module routers |
| 46–60 | **`lifespan(app)`**: Opens LangGraph `psycopg3` pool → runs `AsyncPostgresSaver.setup()` → on shutdown closes pool + SQLAlchemy engine |
| 63 | Creates `FastAPI(title="SETU LMS", version="v0.1.0")` |
| 65 | `setup_logging()` |
| 67–77 | CORS: allow origin `http://localhost:3000` with full methods/headers |
| 80–83 | CSRF middleware: exempts `/auth/login-request`, `/auth/verify-login` |
| 91 | Global `AppException` → `app_exception_handler` |
| 93–117 | Mount all routers under `APIRouter(prefix="/api/v1")` |
| 120–122 | `if __main__`: runs uvicorn on `0.0.0.0:8000` |

---

## 4. Core Layer

### 4.1 `config.py`
📂 [`core/config.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/config.py) — 62 lines

`Settings(BaseSettings)` class. Loaded via `.env`. Uses `@lru_cache` singleton.

| Attribute | Type | Description |
|:---|:---|:---|
| `app_name` | `str` | `"SETU LMS"` |
| `app_version` | `str` | `"v0.1.0"` |
| `database_url` | `PostgresDsn` | SQLAlchemy async conn string |
| `encryption_key` | `str` | AES encryption key |
| `hash_secret` | `str` | HMAC hashing secret |
| `jwt_secret_key` | `str` | JWT signing key |
| `jwt_algorithm` | `str` | e.g. `HS256` |
| `jwt_access_token_expiry` | `int` | Access token TTL (seconds) |
| `jwt_refresh_token_expiry` | `int` | Refresh token TTL (seconds) |
| `smtp_server` | `str` | SMTP host |
| `smtp_port` | `int` | SMTP port |
| `email_sender` | `str` | Sender email |
| `email_password` | `str` | Sender password |
| `redis_host` | `str` | Redis host |
| `redis_port` | `int` | Redis port |
| `otp_expiration_time` | `int` | OTP TTL (seconds) |
| `celery_broker_url` | `str` | Redis URL for Celery |
| `gemini_api_key` | `str` | Google Gemini key |
| `serper_api_key` | `str` | Serper.dev web search key |
| `transcription_server_base_url` | `str` | External transcription API |
| `langgraph_database_url` | `str` | psycopg3 conn string for checkpoints |
| `site_base_url` | `str` | Frontend base URL |
| `azure_connection_string` | `str` | Azure Blob connection |
| `azure_blob_container_name` | `str` | Azure container name |
| `platform_admin_access_key` | `str` | Admin-only access key |

### 4.2 `database.py`
📂 [`core/database.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/database.py) — 21 lines

**Functions/Exports:**
- `engine` — `create_async_engine(pool_size=10, max_overflow=20, pool_recycle=1800, pool_pre_ping=True)`
- `AsyncSessionLocal` — `async_sessionmaker[AsyncSession]`

### 4.3 `langgraph_db.py`
📂 [`core/langgraph_db.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/langgraph_db.py) — 60 lines

**Exports:**
- `langgraph_pool` — `AsyncConnectionPool` (min=1, max=10, autocommit=True, dict_row)
- `typed_langgraph_pool` — Type-casted version for static analysis
- `create_worker_pool()` → `LangGraphPool` — Factory for Celery workers (max=5)

### 4.4 `exception.py`
📂 [`core/exception.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/exception.py) — 60 lines

| Class | Status Code | Error Code |
|:---|:---|:---|
| `AppException` | 500 | `INTERNAL_ERROR` |
| `BadRequestException` | 400 | `BAD_REQUEST` |
| `NotFoundException` | 404 | `NOT_FOUND` |
| `ForbiddenException` | 403 | `BAD_REQUEST` |
| `AgentExecutionError` | — | Custom LangGraph exception |

**Handler:** `app_exception_handler(request, exception)` → `JSONResponse`

### 4.5 `logging.py`
📂 [`core/logging.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/logging.py)

- `setup_logging()` — configures file + console handlers

### 4.6 `time.py`
📂 [`core/time.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/time.py)

- `get_current_timestamp()` → `datetime` (UTC-aware)

### 4.7 `middleware/csrf.py`
📂 [`core/middleware/csrf.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/middleware/csrf.py)

- `CSRFMiddleware` — validates CSRF tokens on mutating requests; skips configured `exempt_paths`

### 4.8 `middleware/request_logging.py`
📂 [`core/middleware/request_logging.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/middleware/request_logging.py)

- `RequestLoggingMiddleware` — logs HTTP method, path, status, timing (currently disabled in main.py)

### 4.9 `security/jwt.py`
📂 [`core/security/jwt.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/security/jwt.py) — 3068 bytes

**Functions:**
- `create_access_token(subject, extra_claims)` → `str`
- `create_refresh_token(subject, extra_claims, expires_delta?)` → `str`
- `decode_token(token, expected_type)` → `dict` (payload)
- `create_csrf_token()` → `str`

### 4.10 `security/dependencies.py`
📂 [`core/security/dependencies.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/security/dependencies.py)

**Functions (FastAPI Depends):**
- `get_current_user(request)` → `UserDetails` — reads `access_token` cookie, decodes JWT, validates session, returns user ORM object
- `validate_refresh_token(request)` → `dict` — reads `refresh_token` cookie, decodes, validates

### 4.11 `security/encryption.py`
📂 [`core/security/encryption.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/security/encryption.py)

- `get_cipher()` → cipher object (AES)
- Used for encrypting PII fields (phone, gender) in `UserDetails`

### 4.12 `security/hashing.py`
📂 [`core/security/hashing.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/security/hashing.py)

- `hash_entity(value)` → `str` — HMAC hash (used to hash emails for lookup)
- `generate_hash(data, length)` → `str` — secure hash for roadmap IDs

### 4.13 `security/otp.py`
📂 [`core/security/otp.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/security/otp.py)

- `generate_otp()` → `str` (6-digit code)
- `store_otp(email, otp)` → `str` (challenge_id) — stores in Redis with TTL

### 4.14 `security/random.py`
📂 [`core/security/random.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/security/random.py)

- `securerandomstring(length)` → `str` — cryptographically secure random string

### 4.15 `security/exception.py`
📂 [`core/security/exception.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/core/security/exception.py)

- `InvalidToken(AppException)` — 401
- `TokenExpired(AppException)` — 401

---

## 5. Shared Layer

### 5.1 `celery.py`
📂 [`shared/celery.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/celery.py)

- `celery_app` — Celery app configured with Redis broker. Sets `WindowsSelectorEventLoopPolicy` before imports.

### 5.2 `redis.py`
📂 [`shared/redis.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/redis.py)

- `redis` — async Redis client singleton (host/port from settings)

### 5.3 `sse_stream.py`
📂 [`shared/sse_stream.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/sse_stream.py)

- SSE `StreamingResponse` helper for real-time AI generation progress

### 5.4 `file_extraction.py`
📂 [`shared/file_extraction.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/file_extraction.py)

- `extract_jd_text(file: UploadFile)` → `str` — extracts text from PDF (PyMuPDF) or DOCX (python-docx)

### 5.5 `pii_analyzer.py`
📂 [`shared/pii_analyzer.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/pii_analyzer.py)

- PII detection & masking using Microsoft Presidio

### 5.6 `notification_signal.py`
📂 [`shared/notification_signal.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/notification_signal.py)

- Real-time notification dispatcher

### 5.7 DB
📂 [`shared/db/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/db)

| File | Exports |
|:---|:---|
| [`base.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/db/base.py) | `class Base(DeclarativeBase)` — all ORM models inherit from this |
| [`dependencies.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/db/dependencies.py) | `get_db()` → `AsyncSession` generator (FastAPI `Depends()`) |
| [`types.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/db/types.py) | `EncryptedText` — custom SQLAlchemy type that auto-encrypts/decrypts on read/write; `EncryptedJSON` — encrypts specific JSON keys |

### 5.8 `llm/gemini.py`
📂 [`shared/llm/gemini.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/llm/gemini.py) — 2434 bytes

- Google Gemini client wrapper
- `generate_content(prompt)` → `str`
- `generate_content_stream(prompt)` → `AsyncGenerator` (for SSE)

### 5.9 Email
📂 [`shared/email/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/email)

| File | Exports |
|:---|:---|
| [`dependencies.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/email/dependencies.py) | `get_background_email_service()` → `BackgroundEmailService` |
| [`provider.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/email/provider.py) | `SMTPEmailProvider` — sends via SMTP (Gmail/Outlook) |
| [`schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/email/schema.py) | `EmailTemplate` enum (`LOGIN_OTP`, `ROADMAP_SHARE`, etc.), `EmailPayload` |
| [`service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/email/service.py) | `BackgroundEmailService.send_email(template, to_emails, **kwargs)` |
| [`tempplate_loader.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/shared/email/tempplate_loader.py) | Jinja2 HTML template loader |
| `templates/` | HTML email templates directory |

---

## 6. Module: Project

📂 [`backend/modules/project/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project) — **7 files**

---

### 6.1 [`model.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/model.py) — 142 lines

#### ORM Classes:

**`Project`** — Table: `projects`

| Column | Type | Constraints |
|:---|:---|:---|
| `project_id` | `UUID` | PK, default `uuid4` |
| `project_name` | `Text` | NOT NULL |
| `organization_id` | `UUID` | FK → `organizations.organization_id`, NOT NULL |
| `function_id` | `UUID` | FK → `functions.function_id`, nullable |
| `designation_id` | `UUID` | FK → `designations.designation_id`, nullable |
| `hiring_goal` | `Text` | — |
| `jd_url` | `Text` | Azure Blob URL |
| `project_status` | `JSONB` | default `{"status": "draft"}` |
| `created_by` | `UUID` | FK → `user_details.user_id` |
| `updated_by` | `UUID` | FK → `user_details.user_id`, nullable |
| `project_details` | `JSONB` | Stores approval_managers, hiring_managers, jd_data, project_type, project_mandate |
| `created_at` | `DateTime(tz)` | auto |
| `updated_at` | `DateTime(tz)` | auto-updated |

**`ProjectHiringManager`** — Table: `project_hiring_managers`

| Column | Type | Constraints |
|:---|:---|:---|
| `project_manager_id` | `UUID` | PK |
| `project_id` | `UUID` | FK → `projects.project_id` (CASCADE) |
| `user_id` | `UUID` | FK → `user_details.user_id` |
| `created_at` | `DateTime(tz)` | auto |

**`ProjectHiringSponsor`** — Table: `project_hiring_sponsors`

| Column | Type | Constraints |
|:---|:---|:---|
| `project_hiring_sponsor_id` | `UUID` | PK |
| `project_id` | `UUID` | FK → `projects.project_id` (CASCADE) |
| `user_id` | `UUID` | FK → `user_details.user_id` |
| `created_by` | `UUID` | FK → `user_details.user_id` |
| `sponsor_details` | `JSONB` | default `{}` |
| `created_at` | `DateTime(tz)` | auto |

**`Function`** — Table: `functions`

| Column | Type | Constraints |
|:---|:---|:---|
| `function_id` | `UUID` | PK |
| `organization_id` | `UUID` | FK → `organizations.organization_id` (CASCADE) |
| `function_name` | `Text` | NOT NULL |
| `function_details` | `JSONB` | default `{}` |
| `created_by` | `UUID` | FK → `user_details.user_id` |
| `created_at` | `DateTime(tz)` | auto |

**`Designation`** — Table: `designations`

| Column | Type | Constraints |
|:---|:---|:---|
| `designation_id` | `UUID` | PK |
| `function_id` | `UUID` | FK → `functions.function_id` |
| `organization_id` | `UUID` | FK → `organizations.organization_id` (CASCADE) |
| `designation_name` | `Text` | NOT NULL |
| `created_by` | `UUID` | FK → `user_details.user_id` |
| `designation_details` | `JSONB` | default `{}` |
| `created_at` | `DateTime(tz)` | auto |

---

### 6.2 [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/router.py) — 271 lines

| Method | Route | Handler | Auth | Description |
|:---|:---|:---|:---|:---|
| `POST` | `/create-project` | `create_project()` | ✅ `get_current_user` | Create project with optional JD file upload to Azure |
| `PUT` | `/projects/{project_id}` | `update_project()` | ❌ | Update project fields + re-upload JD |
| `POST` | `/projects/{project_id}/duplicate` | `duplicate_project_route()` | ❌ | Clone a project with `"(N)"` suffix |
| `GET` | `/get-all-projects` | `get_projects()` | ❌ | List all projects; optional `organization_id` filter |
| `POST` | `/project/details` | `get_project_details()` | ❌ | Get single project by ID |
| `DELETE` | `/delete-project` | `delete_project()` | ❌ | Delete project (requires `confirm=true`) |
| `PUT` | `/project/{project_id}/status` | `change_project_status()` | ❌ | Change status (draft/active/paused/closed) |

**Helper function:** `upload_to_azure_blob(file_stream, filename, content_type)` → uploads to Azure Blob and returns `{"blob_name", "blob_url"}`

---

### 6.3 [`service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/service.py) — 577 lines

| Function | Signature | Description |
|:---|:---|:---|
| `create_project_async()` | `(db, project_in: ProjectCreate) → Project` | Looks up org by name, auto-creates Function/Designation if active, creates project + hiring managers/sponsors |
| `update_project_async()` | `(db, project_id, project_in: ProjectUpdate) → Project` | Partial update with JSONB merge, replaces hiring managers/sponsors |
| `auto_resume_paused_projects()` | `(db)` | Background: resumes `until_date` paused projects whose date has passed |
| `duplicate_project_async()` | `(db, project_id) → Project` | Duplicates project with `"Name (N)"` suffix, copies hiring managers/sponsors |
| `ProjectService.delete_project()` | `(db, project_id) → bool` | Hard delete by project_id |
| `get_project_by_id_async()` | `(db, project_id) → dict` | Joins Organization, Function, Designation for full details |
| `get_all_projects_async()` | `(db, organization_id?) → list[dict]` | Lists all projects with org/function/designation names joined |
| `update_project_status_async()` | `(db, project_id, status_in) → (prev, new)` | Updates project_status JSONB field |

---

### 6.4 [`schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/schema.py) — 130 lines

| Class | Fields |
|:---|:---|
| `ProjectStatusEnum` | `draft`, `active`, `paused`, `closed` |
| `PauseTypeEnum` | `manually`, `indefinitely`, `until_date` |
| `ProjectType` | `skill_gap_assessment`, `roadmap`, `skill_gap_assessment_and_roadmap` |
| `ProjectMandate` | `self`, `team`, `organization` |
| `ProjectStatus` | `status`, `pause_type?`, `resume_date?` |
| `ProjectCreate` | `project_name`, `organization_name`, `function_name?`, `designation_name?`, `hiring_goal?`, `jd_url?`, `created_by?`, `project_status`, `approval_managers[]`, `hiring_sponsors[]`, `hiring_managers[]`, `jd_data?`, `project_type`, `project_mandate` |
| `ProjectUpdate` | All fields from ProjectCreate as optional |
| `ProjectResponse` | `project_id`, `project_name`, `organization_name?`, `function_name?`, `designation_name?`, `hiring_goal?`, `jd_url?`, `project_status?`, `created_at`, `created_by?`, `project_details?`, `profiles_count?`, `avg_score?`, `shortlisted_count?` |
| `ProjectDetailsRequest` | `project_id: UUID` |
| `DeleteProjectRequest` | `project_id: UUID`, `confirm: bool` |

---

### 6.5 [`designation_function_router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/designation_function_router.py) — 77 lines

| Method | Route | Handler |
|:---|:---|:---|
| `GET` | `/organizations/{org_id}/functions` | `list_functions()` |
| `POST` | `/organizations/{org_id}/functions` | `create_function()` |
| `GET` | `/functions/{function_id}/designations` | `list_designations()` |
| `POST` | `/functions/{function_id}/designations` | `create_designation()` |

### 6.6 [`designation_function_service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/designation_function_service.py) — 114 lines

| Function | Description |
|:---|:---|
| `get_all_organizations(db)` | List all organizations |
| `create_organization_async(db, org_in)` | Create org (checks uniqueness) |
| `get_functions_by_org(db, org_id)` | Get functions for an org |
| `create_function_async(db, org_id, func_in)` | Create function under org |
| `get_designations_by_org(db, org_id)` | Get all designations for org |
| `get_designations_by_function(db, function_id)` | Get designations for function |
| `create_designation_async(db, function_id, desig_in)` | Create designation under function |

### 6.7 [`df_schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/project/df_schema.py) — 27 lines

| Class | Fields |
|:---|:---|
| `OrgCreate` | `organization_name`, `organization_details?`, `created_by` |
| `FunctionCreate` | `function_name`, `function_details?`, `created_by?` |
| `DesigCreate` | `designation_name`, `function_id?`, `designation_details?`, `created_by?` |

---

## 7. Module: Auth

📂 [`backend/modules/auth/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/auth) — **6 files**

### 7.1 [`model.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/auth/model.py) — 43 lines

**`UserSessions`** — Table: `user_sessions`

| Column | Type | Constraints |
|:---|:---|:---|
| `session_id` | `Text` | PK |
| `user_id` | `Text` | FK → `user_details.user_id` |
| `current_refresh_jti` | `Text` | NOT NULL — current valid refresh token JTI |
| `status` | `Text` | CHECK IN (`active`, `revoked`), default `active` |
| `created_at` | `DateTime(tz)` | auto |
| `updated_at` | `DateTime(tz)` | auto-updated |
| `expires_at` | `DateTime(tz)` | session expiration |

### 7.2 [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/auth/router.py) — 182 lines, prefix `/auth`

| Method | Route | Handler | Auth | Description |
|:---|:---|:---|:---|:---|
| `POST` | `/auth/login-request` | `login_request()` | ❌ | Send OTP to email via SMTP |
| `POST` | `/auth/verify-login` | `verify_login()` | ❌ | Verify OTP → auto-onboard to org → create session → set HttpOnly cookies (access_token, refresh_token, csrf) |
| `POST` | `/auth/refresh` | `refresh()` | 🔄 refresh_token | Rotate access + refresh tokens (JTI rotation) |
| `POST` | `/auth/logout` | `logout()` | ❌ | Revoke session, delete cookies |

### 7.3 [`service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/auth/service.py) — 145 lines

**`AuthService` class:**

| Method | Description |
|:---|:---|
| `send_login_otp(email)` → `challenge_id` | Validates email, generates OTP, stores in Redis, sends email |
| `verify_login_otp(email, otp, challenge_id)` | Checks Redis OTP, raises `ExpiredOTP` / `InvalidOTP` |
| `create_session(user_id)` → `UserSessions` | Creates DB session with UUID7 refresh JTI |
| `validate_token_session(session_id, user_id)` | Validates session is active, not expired, user matches |
| `refresh_tokens(payload)` → `(access, refresh, session)` | JTI rotation: validates old refresh, creates new pair |
| `validate_email(email)` → `bool` | Regex validation |
| `logout(session_id)` → `bool` | Revokes session in DB |

### 7.4 [`respository.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/auth/respository.py) — 1983 bytes

**`AuthRepository` class:**
- `create_session(user_id, current_refresh_jti)` → `UserSessions`
- `get_session_by_id(session_id)` → `UserSessions | None`
- `update_refresh_jti(session_id, new_jti)` → `bool`
- `revoke_session(session_id)` → `bool`

### 7.5 [`schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/auth/schema.py) — 300 bytes

| Class | Fields |
|:---|:---|
| `SendOTPRequest` | `email: str` |
| `SendOTPResponse` | `challenge_id: str` |
| `VerifyOTPRequest` | `email`, `otp`, `challenge_id` |
| `VerifyOTPResponse` | `status: str` |

### 7.6 [`exception.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/auth/exception.py) — 425 bytes

| Exception | Status | Description |
|:---|:---|:---|
| `ExpiredOTP` | 400 | OTP has expired |
| `InvalidOTP` | 400 | Wrong OTP code |
| `SessionRevoked` | 401 | Session revoked |
| `SessionExpired` | 401 | Session expired |

---

## 8. Module: User

📂 [`backend/modules/user/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/user) — **6 files**

### 8.1 [`model.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/user/model.py) — 118 lines

**`UserDetails`** — Table: `user_details`

| Column | Type | Constraints |
|:---|:---|:---|
| `user_id` | `UUID` | PK (UUID7 via `generate_user_id()`) |
| `user_name` | `String(100)` | nullable |
| `user_email` | `Text` | UNIQUE, NOT NULL (plaintext email) |
| `email` | `Text` | UNIQUE, NOT NULL (HMAC-hashed email for lookup) |
| `profile_image` | `Text` | nullable |
| `registration_date` | `DateTime(tz)` | auto |
| `institute_or_organization` | `String(200)` | nullable |
| `provided_role` | `String(100)` | default `"Learner"` |
| `utm_source` | `String(100)` | nullable |
| `phone_no` | `EncryptedText` | UNIQUE, nullable (AES encrypted) |
| `linkedin_profile` | `String(255)` | nullable |
| `designation_specialization` | `String(150)` | nullable |
| `year_of_experience` | `Float` | nullable |
| `gender` | `EncryptedText` | nullable (AES encrypted) |

**Relationships:**
- `roadmap_associations` → `UserRoadmap[]` (user's roadmaps)
- `granted_roadmaps` → `UserRoadmap[]` (roadmaps granted by this user)

### 8.2 [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/user/router.py) — 17 lines, prefix `/user`

| Method | Route | Handler | Auth |
|:---|:---|:---|:---|
| `GET` | `/user/me` | `get_me()` | ✅ `get_current_user` |

### 8.3 [`service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/user/service.py) — 70 lines

**`UserService` class:**
- `find_user_by_id(user_id)` / `find_user_by_email(email)` → `UserDetails | None`
- `get_user_by_id(user_id)` → `UserDetails` (raises `UserNotFound`)
- `create_user(data: UserCreate)` → `UserDetails`
- `get_or_create_user(email)` → `UserDetails` (used by auth flow)
- `update_user(user_id, data)` → `UserDetails`
- `get_user_details(user)` → `UserResponse` (includes org memberships)

### 8.4 [`repository.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/user/repository.py) — 2631 bytes

- `get_by_id(user_id)`, `get_by_email(email)`, `create_user(data)`, `update_user(user_id, data)`, `get_user_organization(user_id)`

### 8.5 [`schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/user/schema.py), 8.6 [`exception.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/user/exception.py)

- `UserCreate`, `UserUpdate`, `UserResponse` schemas
- `UserNotFound` exception

---

## 9. Module: Organization

📂 [`backend/modules/organization/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/organization) — **6 files**

### 9.1 [`model.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/organization/model.py) — 125 lines

**`Organization`** — Table: `organizations`

| Column | Type | Constraints |
|:---|:---|:---|
| `organization_id` | `UUID` | PK (UUID7) |
| `organization_name` | `Text` | NOT NULL |
| `organization_details` | `JSONB` | default `{}` (stores `allowed_email_domains[]` etc.) |
| `created_by` | `UUID` | FK → `user_details.user_id` |
| `updated_by` | `UUID` | FK → `user_details.user_id` |
| `created_at` / `updated_at` | `DateTime(tz)` | auto |

**`OrganizationMembership`** — Table: `organization_memberships`

| Column | Type | Constraints |
|:---|:---|:---|
| `user_id` | `UUID` | PK (composite), FK → `user_details` (CASCADE) |
| `organization_id` | `UUID` | PK (composite), FK → `organizations` (CASCADE) |
| `status` | `Enum` | `active` / `invited` / `removed` |
| `joined_at` | `DateTime(tz)` | auto |

### 9.2 [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/organization/router.py) — 161 lines, prefix `/organizations`

| Method | Route | Handler | Auth |
|:---|:---|:---|:---|
| `POST` | `/organizations` | `create_organization()` | ✅ (admin only + access_key) |
| `GET` | `/organizations` | `get_user_organizations()` | ✅ |
| `GET` | `/organizations/{id}` | `get_organization()` | ✅ |
| `PUT` | `/organizations/{id}` | `update_organization()` | ✅ (admin + access_key) |
| `DELETE` | `/organizations/{id}` | `delete_organization()` | ✅ (admin + access_key) |
| `GET` | `/organizations/{id}/teams` | `get_organization_teams()` | ✅ |
| `POST` | `/organizations/{id}/members` | `add_member()` | ✅ |
| `DELETE` | `/organizations/{id}/members/{userId}` | `remove_member()` | ✅ |
| `GET` | `/organizations/{id}/members` | `get_members()` | ✅ |

### 9.3 [`service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/organization/service.py) — 159 lines

**`OrganizationService` class:**
- `create_organization(data, created_by)` — creates org + adds creator as member
- `get_organization_by_id(id)`, `update_organization(id, data)`, `delete_organization(id)`
- `get_organization_teams(id, user_id)` → `list[Team]`
- `add_member(org_id, data)`, `remove_member(org_id, member_id)`, `get_members(org_id)`
- `get_user_organizations(user_id)` → `list[OrganizationMembership]`
- `onboard_user_to_organization_by_email_domain(email)` — auto-matches email domain to `allowed_email_domains` JSONB field

---

## 10. Module: Team

📂 [`backend/modules/team/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/team) — **6 files**

### 10.1 [`model.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/team/model.py) — 123 lines

**`Team`** — Table: `teams`

| Column | Type | Constraints |
|:---|:---|:---|
| `team_id` | `Text` | PK (UUID7) |
| `organization_id` | `Text` | FK → `organizations` (CASCADE) |
| `created_by` | `Text` | FK → `user_details.user_id` |
| `name` | `Text` | NOT NULL |
| `slug` | `Text` | UNIQUE |
| `team_metadata` | `JSONB` | default `{}` |
| `created_at` / `updated_at` | `DateTime(tz)` | auto |

**`TeamMembership`** — Table: `team_memberships`

| Column | Type | Constraints |
|:---|:---|:---|
| `user_id` | `Text` | PK (composite), FK → `user_details` (CASCADE) |
| `team_id` | `Text` | PK (composite), FK → `teams` (CASCADE) |
| `status` | `Enum` | `TeamMembershipStatus` |
| `joined_at` | `DateTime(tz)` | auto |

### 10.2 [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/team/router.py) — 114 lines, prefix `/organizations/{organization_id}/teams`

| Method | Route | Handler |
|:---|:---|:---|
| `POST` | `.../teams` | `create_team()` |
| `GET` | `.../teams/{team_id}` | `get_team()` |
| `PUT` | `.../teams/{team_id}` | `update_team()` |
| `DELETE` | `.../teams/{team_id}` | `delete_team()` |
| `POST` | `.../teams/{team_id}/members` | `add_member()` |
| `DELETE` | `.../teams/{team_id}/members/{userId}` | `remove_member()` |
| `GET` | `.../teams/{team_id}/members` | `get_members()` |

---

## 11. Module: Assessment

📂 [`backend/modules/assessment/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment) — **5 files + 2 sub-modules**

### 11.1 [`model.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment/model.py) — 240 lines

**`AssessmentFormation`** — Table: `assessment_formation`

| Column | Type |
|:---|:---|
| `assessment_formation_id` | `UUID` PK |
| `assessment_formation_name` | `String(255)` |
| `assessment_duration` | `Integer` |
| `assessment_details` | `JSONB` |
| `curate_flow_node_id` | `UUID` |
| `designation_id` | `UUID` FK |
| `function_id` | `UUID` FK |
| `organization_id` | `UUID` |
| `created_by` / `updated_by` | `UUID` FK |
| `created_at` / `updated_at` | `DateTime(tz)` |

**`Competency`** — Table: `competencies`

| Column | Type |
|:---|:---|
| `competency_id` | `UUID` PK |
| `competency_name` | `String(255)` NOT NULL |
| `competency_description` | `Text` |
| `source_of_competency` | `String(255)` |
| `organization_id` | `UUID` |
| `designation_id` / `function_id` | `UUID` FK |
| `competency_details` | `JSONB` |

**`Subcompetency`** — Table: `subcompetencies`

| Column | Type |
|:---|:---|
| `subcompetency_id` | `UUID` PK |
| `competency_id` | `UUID` FK → `competencies` (CASCADE) |
| `subcompetency_name` | `String(255)` NOT NULL |
| `subcompetency_description` | `Text` |

**`McqQuestion`** — Table: `mcq_questions`

| Column | Type |
|:---|:---|
| `mcq_question_id` | `UUID` PK |
| `question_text` | `Text` NOT NULL |
| `option_1` / `option_2` / `option_3` / `option_4` | `Text` |
| `correct_option_text` | `Text` |
| `question_type` | `Text` (default `mcq`) |
| `competency_id` / `subcompetency_id` | `UUID` FK |
| `hints_text` / `code_snippets` | `Text` |
| `marks` | `Integer` |

**`ProjectAssessmentMap`** — Table: `project_assessment_map`

| Column | Type |
|:---|:---|
| `project_assessment_map_id` | `UUID` PK |
| `project_id` | `UUID` |
| `assessment_formation_id` | `UUID` FK |
| `created_by` | `UUID` FK |

### 11.2 [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment/router.py) — 74 lines, prefix `/assessment`

| Method | Route | Handler |
|:---|:---|:---|
| `PUT` | `/assessment/{assessment_id}` | `update_assessment()` |
| `POST` | `/assessment` | `create_assessment()` |
| `POST` | `/assessment/process-questions-upload` | `process_questions_upload()` |
| `POST` | `/assessment/competency/upload` | `upload_competency_file()` |

Plus includes sub-routers: `assessment_access_router`, `imr_router`

### 11.3 Sub-module: `assessment_access/` — 4 files

- `model.py` — `AssessmentAccess` table
- `router.py` — Access control endpoints
- `schema.py` — `AccessGrant`, `AccessResponse`
- `service.py` — Grant/revoke assessment access

### 11.4 Sub-module: `improvement_roadmap/` — 4 files

- `prompt.py` — LLM prompts for improvement roadmap generation
- `router.py` — `/assessment/{id}/improvement-roadmap`
- `schema.py` — `ImprovementRoadmapResponse`
- `service.py` — Generate improvement roadmap via Gemini LLM

---

## 12. Module: Assessment Attempt

📂 [`backend/modules/assessment_attempt/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment_attempt) — **7 files**

### 12.1 [`model.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment_attempt/model.py) — 65 lines

**`AllocatedExams`** — Table: `allocated_exams`

| Column | Type |
|:---|:---|
| `allocation_id` | `Text` PK |
| `user_id` | `UUID` FK → `user_details` |
| `exam_id` | `UUID` |
| `allocated_questions` | `JSONB` |
| `total_questions` | `Integer` |
| `complexity_distribution` | `JSONB` |
| `exam_duration` | `Integer` |
| `allocated_date` | `DateTime(tz)` |
| `test_language` | `Text` (default `en-US`) |
| `assessment_type` | `Text` |

**`Submissions`** — Table: `submissions`

| Column | Type |
|:---|:---|
| `submission_id` | `Integer` PK (autoincrement) |
| `allocation_id` | `Text` FK → `allocated_exams` |
| `submission_details` | `JSONB` |
| `total_marks` / `obtained_marks` / `obtained_percentage` | `Float` |
| `secured_level` | `Text` |
| `submission_mode` | `Text` |
| `submission_time` | `DateTime(tz)` |
| `total_time_taken` / `average_time_taken` | `Text` |
| `number_of_attempted_question` | `Integer` |
| `total_number_of_correct_answer` / `total_number_of_partial_correct_answer` | `Integer` |
| `best_streak` | `Integer` |
| `detailed_result` | `JSONB` |
| `evaluation_details` | `JSONB` |
| `final_result` | `JSONB` |
| `is_final_submission` | `Boolean` |

### 12.2 [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment_attempt/router.py) — 114 lines, prefix `/exam`

| Method | Route | Handler |
|:---|:---|:---|
| `POST` | `/exam/details` | `get_exam_details_route()` |
| `POST` | `/exam/allocate` | `allocate_exam_route()` |
| `POST` | `/exam/evaluate` | `evaluate_exam_route()` |
| `GET` | `/exam/get-result/{allocation_id}` | `get_exam_result()` |

### 12.3 Other files:

| File | Key Functions |
|:---|:---|
| [`allocation_service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment_attempt/allocation_service.py) (11KB) | `ExamAllocationService.allocate_exam(user, data, user_agent)` — selects questions, creates allocation |
| [`evaluation_service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment_attempt/evaluation_service.py) (23KB) | `ExamEvaluationSerice.evaluate_exam(user, payload)` — AI-powered answer scoring via Gemini, calculates competency scores |
| [`exam_service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment_attempt/exam_service.py) (2.5KB) | `ExamService.get_exam_details(user, org, project, assessment, type, roadmap)` |
| [`encryption.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment_attempt/encryption.py) (1.2KB) | Encrypt/decrypt exam answer payloads |
| [`schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/assessment_attempt/schema.py) | `AllocateExam`, `EvaluateExamPayload`, `ExamDetails`, `ExamDetailsRequest` |

---

## 13. Module: Roadmap

📂 [`backend/modules/roadmap/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap) — **8 files**

### 13.1 [`model.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap/model.py) — 197 lines

**`Roadmap`** — Table: `roadmaps`

| Column | Type | Constraints |
|:---|:---|:---|
| `roadmap_id` | `Text` | PK (HMAC hash of UUID7 + secrets) |
| `user_id` | `Text` | FK → `user_details` (CASCADE) |
| `organization_id` | `Text` | FK → `organizations` (CASCADE) |
| `team_id` | `Text` | FK → `teams` (CASCADE), nullable |
| `project_id` | `Text` | FK → `projects` (CASCADE) |
| `title` | `Text` | NOT NULL |
| `description` | `Text` | NOT NULL |
| `roadmap_graph` | `JSONB` | Graph structure (nodes + edges) |
| `roadmap_content` | `JSONB` | Generated learning content |
| `price` | `JSONB` | default `[]` |
| `level` | `Text` | CHECK IN (`beginner`, `intermediate`, `advanced`) |
| `status` | `Text` | CHECK IN (`published`, `pending`, `draft`) |
| `visibility_scope` | `Text` | CHECK IN (`public`, `org`, `team`, `private`) |
| `roadmap_metadata` | `JSONB` | default `{}` |
| `search_vector` | `TSVECTOR` | Computed full-text search index (GIN) |
| `created_at` / `updated_at` | `DateTime(tz)` | auto |

**`UserRoadmap`** — Table: `user_roadmap`

| Column | Type | Constraints |
|:---|:---|:---|
| `user_id` | `Text` | PK (composite), FK → `user_details` |
| `roadmap_id` | `Text` | PK (composite), FK → `roadmaps` |
| `granted_by` | `Text` | FK → `user_details` |
| `role` | `Text` | CHECK IN (`owner`, `viewer`, `editor`) |
| `sharing_mode` | `Text` | CHECK IN (`basic_sharing`, `purchase`, `public_sharing`, `owner_sharing`, `access_shared_by_admin`, `collaboration`) |
| `user_roadmap_data` | `JSONB` | default `{}` |
| `status` | `Text` | CHECK IN (`active`, `blocked`) |

### 13.2 Other files:

| File | Key Functions |
|:---|:---|
| [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap/router.py) (3.3KB) | Roadmap CRUD endpoints |
| [`service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap/service.py) (18KB) | `create_roadmap()`, `get_roadmap_tree()`, `update_roadmap_structure()` |
| [`repository.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap/repository.py) (3.2KB) | Roadmap DB CRUD |
| [`roadmap_access_router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap/roadmap_access_router.py) (2.7KB) | Share/revoke roadmap access |
| [`roadmap_access_service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap/roadmap_access_service.py) (21KB) | `share_roadmap()`, `revoke_access()`, email notifications |
| [`schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap/schema.py) (2.5KB) | Pydantic models |
| [`exceptions.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap/exceptions.py) | Roadmap exceptions |

---

## 14. Module: Roadmap Agent

📂 [`backend/modules/roadmap_agent/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent) — **8 files + nodes/**

LangGraph stateful AI agent for **personalized learning roadmap generation** through multi-turn conversations.

| File | Size | Description |
|:---|:---|:---|
| [`agent.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/agent.py) | 14KB | `RoadmapAgentManager`: compiles StateGraph, creates `AsyncPostgresSaver`, invokes agent with conversation history |
| [`graph.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/graph.py) | 3.4KB | LangGraph `StateGraph` wiring: defines node connections & conditional edges |
| [`state.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/state.py) | 1.2KB | `TypedDict` state: messages, roadmap_data, intent, career_context |
| [`schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/schema.py) | 7.3KB | Agent input/output Pydantic models |
| [`prompts.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/prompts.py) | 15KB | System & user prompt templates for each node |
| [`context.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/context.py) | 252B | Context variable bindings |
| [`utils.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/utils.py) | 2.5KB | Helper utilities |

### `nodes/` — Graph Node Implementations

| File | Description |
|:---|:---|
| [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/nodes/router.py) | Intent router — routes to correct graph branch |
| [`analyze_intent.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/nodes/analyze_intent.py) (10KB) | Classifies user intent (create/edit/question) via Gemini |
| [`gather_career_context.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/nodes/gather_career_context.py) (6.7KB) | Extracts career info from messages |
| [`generate_clarification.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/nodes/generate_clarification.py) (9.1KB) | Generates follow-up clarifying questions |
| [`create_roadmap.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/nodes/create_roadmap.py) (11KB) | Generates full roadmap JSON via Gemini |
| [`edit_roadmap.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/nodes/edit_roadmap.py) (27KB) | Edits existing roadmap structure |
| [`prepare_approval.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_agent/nodes/prepare_approval.py) (9KB) | Prepares roadmap for user approval |

---

## 15. Module: Doubt Solver Agent

📂 [`backend/modules/doubt_solver_agent/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/doubt_solver_agent) — **5 files + nodes/**

LangGraph AI agent for answering learner doubts using roadmap content as RAG context.

| File | Size | Description |
|:---|:---|:---|
| [`agent.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/doubt_solver_agent/agent.py) | 10KB | `DoubtSolverAgentManager` |
| [`graph.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/doubt_solver_agent/graph.py) | 1.3KB | StateGraph definition |
| [`state.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/doubt_solver_agent/state.py) | 339B | State schema |
| [`schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/doubt_solver_agent/schema.py) | 382B | Input/output models |
| [`prompts.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/doubt_solver_agent/prompts.py) | 5KB | Prompt templates |

### `nodes/` — 3 files

| File | Description |
|:---|:---|
| [`analyze_intent.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/doubt_solver_agent/nodes/analyze_intent.py) (3KB) | Classify doubt intent |
| [`inject_context.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/doubt_solver_agent/nodes/inject_context.py) (4.8KB) | Inject roadmap node content as RAG context |
| [`draft_response.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/doubt_solver_agent/nodes/draft_response.py) (5KB) | Generate AI response via Gemini |

---

## 16. Module: Thread

📂 [`backend/modules/thread/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/thread) — **7 files**

### 16.1 [`model.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/thread/model.py) — 117 lines

**`ChatThread`** — Table: `chat_threads`

| Column | Type |
|:---|:---|
| `thread_id` | `Text` PK |
| `user_id` | `Text` FK → `user_details` (CASCADE) |
| `organization_id` | `Text` FK → `organizations` (CASCADE) |
| `team_id` | `Text` FK → `teams` (CASCADE), nullable |
| `project_id` | `Text` FK → `projects` (CASCADE) |
| `title` | `Text` nullable |
| `thread_type` | `Text` (e.g. `roadmap_generation`, `roadmap_doubt`) |
| `thread_metadata` | `JSONB` |
| `created_at` / `updated_at` | `DateTime(tz)` |

**`ConversationMessage`** — Table: `conversation_messages`

| Column | Type |
|:---|:---|
| `message_id` | `Text` PK |
| `thread_id` | `Text` FK → `chat_threads` (CASCADE) |
| `user_id` | `Text` FK → `user_details` (CASCADE) |
| `role` | `Text` CHECK IN (`human`, `assistant`) |
| `content` | `JSONB` (list of content blocks) |
| `message_metadata` | `JSONB` |
| Indexes | `idx_conv_thread_created`, `idx_conv_thread_updated` |

### 16.2 [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/thread/router.py) — 339 lines, prefix `/thread`

| Method | Route | Handler |
|:---|:---|:---|
| `POST` | `/thread/roadmap/chat` | `roadmap_chat()` — start roadmap generation thread |
| `POST` | `/thread/doubt/chat` | `doubt_chat()` — start doubt solver thread |
| `GET` | `/thread/stream?t_id=` | `chat_stream()` — SSE stream via Redis pub/sub |
| `POST` | `/thread/{thread_id}/messages` | `get_chat_by_id()` — get all messages + artifacts |
| `POST` | `/thread/message/feedback` | `update_message_feedback_route()` |
| `GET` | `/thread/all?t=&org=&team=` | `get_all_chats()` — list threads by type/org/team |
| `PUT` | `/thread/{thread_id}/update` | `update_thread_route()` |
| `POST` | `/thread/artifact/email` | `email_roadmap_route()` — email roadmap as attachment |
| `DELETE` | `/thread/{thread_id}/delete` | `delete_thread_route()` |
| `POST` | `/thread/{thread_id}/stop` | `stop_thread_route()` — cancel running agent |

### 16.3 [`service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/thread/service.py) — 15KB

**`ThreadService` class:**
- `start_roadmap_generation_thread(user_id, data)` — creates/reuses thread, invokes `RoadmapAgentManager`
- `start_doubt_solver_agent_thread(user_id, data)` — creates/reuses thread, invokes `DoubtSolverAgentManager`
- `update_thread(thread_id, user_id, data)`, `delete_thread()`, `stop_thread()`
- `email_roadmap(thread_id, email, attachments)`

---

## 17. Module: AI Content Generation

📂 [`backend/modules/ai_content_generation/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/ai_content_generation) — **6 files**

| File | Key Contents |
|:---|:---|
| [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/ai_content_generation/router.py) | `POST /ai/generate-competencies`, `POST /ai/generate-questions` |
| [`service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/ai_content_generation/service.py) (32KB) | `generate_competencies_from_jd()`, `generate_questions_from_competencies()` — SSE streaming via Gemini |
| [`prompt.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/ai_content_generation/prompt.py) (4.5KB) | LLM prompt templates |
| [`tasks.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/ai_content_generation/tasks.py) (11KB) | Celery async tasks |
| [`utils.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/ai_content_generation/utils.py) (1.6KB) | Response parsing |
| [`schema.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/ai_content_generation/schema.py) | Request/response models |

---

## 18. Module: Artifact

📂 [`backend/modules/artifact/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/artifact) — **5 files**

**`ArtifactRepository`** — Table: `artifact_repository`

| Column | Type |
|:---|:---|
| `artifact_id` | `Text` PK (UUID7) |
| `thread_id` | `Text` FK → `chat_threads` (CASCADE) |
| `organization_id` | `Text` FK → `organizations` (CASCADE) |
| `team_id` | `Text` FK → `teams` (CASCADE), nullable |
| `project_id` | `Text` FK → `projects` (CASCADE) |
| `title` / `description` | `Text` |
| `artifact_data` | `JSONB` (the actual roadmap JSON) |
| `artifact_type` | `Text` |
| `artifact_metadata` | `JSONB` (version info) |
| `created_at` / `updated_at` | `DateTime(tz)` |

---

## 19. Module: Roadmap Content

📂 [`backend/modules/roadmap_content/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_content) — **3 files**

| File | Description |
|:---|:---|
| `router.py` (3.9KB) | `GET /roadmap-content/{nodeId}` |
| `schema.py` (433B) | `ContentRequest`, `ContentResponse` |
| `service.py` (11.7KB) | `generate_node_content()` via Gemini AI, `fetch_content()` |

---

## 20. Module: Roadmap Snippet

📂 [`backend/modules/roadmap_snippet/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_snippet) — **5 files**

**`RoadmapUserData`** — Table: `roadmap_user_data`

| Column | Type |
|:---|:---|
| `id` | `Integer` PK (autoincrement) |
| `user_id` | `Text` FK → `user_details` (CASCADE) |
| `organization_id` | `Text` FK → `organizations` (CASCADE) |
| `preferences` | `JSONB` |
| `created_at` / `updated_at` | `DateTime(tz)` |

---

## 21. Module: Roadmap Learning Assessment

📂 [`backend/modules/roadmap_learning_assessment/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_learning_assessment) — **6 files**

**`RoadmapLearningAssessment`** — Table: `roadmap_learning_assessment`

| Column | Type |
|:---|:---|
| `assessment_id` | `UUID` PK |
| `title` | `Text` NOT NULL |
| `roadmap_id` | `Text` FK → `roadmaps` |
| `node_id` | `Text` |
| `organization_id` | `UUID` |
| `duration` | `Integer` |
| `assessment_url` / `excel_export_url` | `Text` |
| `assessment_details` | `JSONB` |
| Relationship | `questions` → `RoadmapLearningAssessmentQuestions[]` |

**`RoadmapLearningAssessmentQuestions`** — Table: `roadmap_learning_assessment_questions`

| Column | Type |
|:---|:---|
| `question_id` | `UUID` PK |
| `assessment_id` | `UUID` FK → `roadmap_learning_assessment` |
| `question_text` | `Text` NOT NULL |
| `option_1` / `option_2` / `option_3` / `option_4` | `Text` |
| `correct_option_text` | `Text` |
| `question_type` | `Text` (default `mcq`) |
| `topic` / `subtopic` | `Text` |
| `solution_explanation` | `Text` |
| `marks` | `Integer` |

| File | Description |
|:---|:---|
| [`service.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_learning_assessment/service.py) (41KB) | Generate quiz questions via Gemini, evaluate answers |
| [`prompt.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_learning_assessment/prompt.py) (37KB) | LLM prompt templates |
| [`tasks.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_learning_assessment/tasks.py) (7KB) | Celery background tasks |
| [`router.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/roadmap_learning_assessment/router.py) (3.3KB) | Endpoints |

---

## 22. Module: Course Recommendation

📂 [`backend/modules/course_recommendation/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/course_recommendation) — **7 files**

**`EYCourses`** — Table: `ey_courses`

| Column | Type |
|:---|:---|
| `id` | `Integer` PK (autoincrement) |
| `course_id` | `Text` NOT NULL |
| `course_name` | `EncryptedText` (AES) |
| `course_url` | `EncryptedText` (AES) |
| `course_modules` | `JSONB` |
| `course_description` | `EncryptedText` (AES) |
| `course_metadata` | `EncryptedJSON` (selectively encrypted keys) |

| File | Description |
|:---|:---|
| `service.py` (9.8KB) | Recommend courses via Gemini + Serper web search |
| `prompt.py` (2.4KB) | LLM prompts |
| `tasks.py` (9.5KB) | Celery async tasks |
| `utils.py` (5.3KB) | Web search result parsing |

---

## 23. Module: Background Jobs

📂 [`backend/modules/background_jobs/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/background_jobs) — **6 files**

**`BackgroundJob`** — Table: `background_jobs`

| Column | Type |
|:---|:---|
| `id` | `Integer` PK (autoincrement) |
| `job_id` | `Text` (UNIQUE with org_id) |
| `organization_id` | `Text` FK → `organizations` |
| `team_id` | `Text` FK → `teams`, nullable |
| `job_type` | `String(255)` |
| `job_data` | `JSONB` |
| `status` | `String(50)` (default `pending`) |
| `metadata` | `JSONB` |

**`BackgroundTaskNotificationPreference`** — Table: `background_task_notification_preference`

| Column | Type |
|:---|:---|
| `id` | `Integer` PK |
| `user_id` | `Text` FK → `user_details` |
| `job_id` | `Text` |
| `notification_type` | `Text` |
| `status` | `Text` |
| `channels` | `JSONB` |
| `content` | `JSONB` |

---

## 24. Module: Learning Progress

📂 [`backend/modules/learning_progress/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/learning_progress) — **3 files**

| File | Description |
|:---|:---|
| `router.py` (1.6KB) | Progress tracking endpoints |
| `schema.py` (199B) | `ProgressUpdate`, `ProgressResponse` |
| `service.py` (8.2KB) | `update_node_progress()`, `get_roadmap_progress()` |

---

## 25. Module: Audio Transcription

📂 [`backend/modules/audio_transcription/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/audio_transcription) — **2 files**

| File | Description |
|:---|:---|
| `router.py` (811B) | `POST /transcribe` |
| `service.py` (1.5KB) | Proxies audio to external transcription server |

---

## 26. Module: Open Source Content Sources

📂 [`backend/modules/opensource_content_sources/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/modules/opensource_content_sources) — **4 files**

**`OpenSourceContentSource`** — Table: `opensource_content_sources`

| Column | Type |
|:---|:---|
| `content_source_id` | `Text` PK |
| `created_by` | `Text` FK → `user_details` |
| `source_name` | `Text` NOT NULL |
| `source_url` | `Text` UNIQUE, NOT NULL |
| `topic` | `Text` nullable |
| `created_at` / `updated_at` | `DateTime(tz)` |

---

## 27. Scripts (Seed Data)

📂 [`backend/scripts/`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/scripts) — **5 files**

| Script | Size | Description |
|:---|:---|:---|
| [`seed_user.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/scripts/seed_user.py) | 3.5KB | Create initial admin & test users |
| [`seed_role.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/scripts/seed_role.py) | 1.7KB | Create RBAC roles |
| [`seed_permissions.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/scripts/seed_permissions.py) | 5.5KB | Create feature-level permissions |
| [`seed_features.py`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/scripts/seed_features.py) | 11KB | Create platform feature flags |
| [`dev-mode-running-scripts.md`](file:///c:/Users/Admin/Downloads/code_sharing_31082026/backend/scripts/dev-mode-running-scripts.md) | 616B | Instructions for running seeds |

---

## 28. All DB Tables & Columns (Master List)

| # | Table Name | Module | Primary Key |
|:---|:---|:---|:---|
| 1 | `projects` | project | `project_id` (UUID) |
| 2 | `project_hiring_managers` | project | `project_manager_id` (UUID) |
| 3 | `project_hiring_sponsors` | project | `project_hiring_sponsor_id` (UUID) |
| 4 | `functions` | project | `function_id` (UUID) |
| 5 | `designations` | project | `designation_id` (UUID) |
| 6 | `user_sessions` | auth | `session_id` (Text) |
| 7 | `user_details` | user | `user_id` (UUID) |
| 8 | `organizations` | organization | `organization_id` (UUID) |
| 9 | `organization_memberships` | organization | (`user_id`, `organization_id`) |
| 10 | `teams` | team | `team_id` (Text) |
| 11 | `team_memberships` | team | (`user_id`, `team_id`) |
| 12 | `assessment_formation` | assessment | `assessment_formation_id` (UUID) |
| 13 | `competencies` | assessment | `competency_id` (UUID) |
| 14 | `subcompetencies` | assessment | `subcompetency_id` (UUID) |
| 15 | `mcq_questions` | assessment | `mcq_question_id` (UUID) |
| 16 | `project_assessment_map` | assessment | `project_assessment_map_id` (UUID) |
| 17 | `allocated_exams` | assessment_attempt | `allocation_id` (Text) |
| 18 | `submissions` | assessment_attempt | `submission_id` (Integer) |
| 19 | `roadmaps` | roadmap | `roadmap_id` (Text) |
| 20 | `user_roadmap` | roadmap | (`user_id`, `roadmap_id`) |
| 21 | `chat_threads` | thread | `thread_id` (Text) |
| 22 | `conversation_messages` | thread | `message_id` (Text) |
| 23 | `artifact_repository` | artifact | `artifact_id` (Text) |
| 24 | `roadmap_user_data` | roadmap_snippet | `id` (Integer) |
| 25 | `roadmap_learning_assessment` | roadmap_learning_assessment | `assessment_id` (UUID) |
| 26 | `roadmap_learning_assessment_questions` | roadmap_learning_assessment | `question_id` (UUID) |
| 27 | `ey_courses` | course_recommendation | `id` (Integer) |
| 28 | `background_jobs` | background_jobs | `id` (Integer) |
| 29 | `background_task_notification_preference` | background_jobs | `id` (Integer) |
| 30 | `opensource_content_sources` | opensource_content_sources | `content_source_id` (Text) |

---

## 29. Complete API Route Map

All routes are prefixed with `/api/v1`.

### Project (`/api/v1/`)
| Method | Route | Auth |
|:---|:---|:---|
| POST | `/create-project` | ✅ |
| PUT | `/projects/{project_id}` | ❌ |
| POST | `/projects/{project_id}/duplicate` | ❌ |
| GET | `/get-all-projects?organization_id=` | ❌ |
| POST | `/project/details` | ❌ |
| DELETE | `/delete-project` | ❌ |
| PUT | `/project/{project_id}/status` | ❌ |
| GET | `/organizations/{org_id}/functions` | ❌ |
| POST | `/organizations/{org_id}/functions` | ❌ |
| GET | `/functions/{function_id}/designations` | ❌ |
| POST | `/functions/{function_id}/designations` | ❌ |

### Auth (`/api/v1/auth/`)
| Method | Route |
|:---|:---|
| POST | `/auth/login-request` |
| POST | `/auth/verify-login` |
| POST | `/auth/refresh` |
| POST | `/auth/logout` |

### User (`/api/v1/user/`)
| Method | Route | Auth |
|:---|:---|:---|
| GET | `/user/me` | ✅ |

### Organization (`/api/v1/organizations/`)
| Method | Route | Auth |
|:---|:---|:---|
| POST/GET | `/organizations` | ✅ |
| GET/PUT/DELETE | `/organizations/{id}` | ✅ |
| GET | `/organizations/{id}/teams` | ✅ |
| POST/GET | `/organizations/{id}/members` | ✅ |
| DELETE | `/organizations/{id}/members/{userId}` | ✅ |

### Team (`/api/v1/organizations/{org_id}/teams/`)
| Method | Route |
|:---|:---|
| POST/GET | `.../teams`, `.../teams/{id}` |
| PUT/DELETE | `.../teams/{id}` |
| POST/GET | `.../teams/{id}/members` |
| DELETE | `.../teams/{id}/members/{userId}` |

### Assessment (`/api/v1/assessment/`)
| Method | Route |
|:---|:---|
| POST | `/assessment` |
| PUT | `/assessment/{id}` |
| POST | `/assessment/process-questions-upload` |
| POST | `/assessment/competency/upload` |

### Exam / Assessment Attempt (`/api/v1/exam/`)
| Method | Route |
|:---|:---|
| POST | `/exam/details` |
| POST | `/exam/allocate` |
| POST | `/exam/evaluate` |
| GET | `/exam/get-result/{allocation_id}` |

### Thread (`/api/v1/thread/`)
| Method | Route |
|:---|:---|
| POST | `/thread/roadmap/chat` |
| POST | `/thread/doubt/chat` |
| GET | `/thread/stream?t_id=` |
| POST | `/thread/{id}/messages` |
| POST | `/thread/message/feedback` |
| GET | `/thread/all?t=&org=&team=` |
| PUT | `/thread/{id}/update` |
| POST | `/thread/artifact/email` |
| DELETE | `/thread/{id}/delete` |
| POST | `/thread/{id}/stop` |

---

> **Total: 20 modules • 30 DB tables • 50+ API endpoints • 100+ files**
