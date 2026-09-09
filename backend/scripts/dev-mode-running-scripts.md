- Export requirements.txt from uv project without any transitive dependency
  ```bash
    uv pip compile pyproject.toml --no-deps --no-annotate --no-header > requirements.txt
  ```

- Run frontend
  ```bash
  npm run dev
  ```

- Run backend
  ```bash
    uv run uvicorn main:app --reload
  ```

- Run celery
  ```bash
  celery -A shared.celery.celery_app worker --loglevel=info --pool=solo
  ```

- Run Question Generation backend
  ```bash
    cd app
    python -m venv venv
    pip install -r requirements.txt
    cd ..
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
  ```