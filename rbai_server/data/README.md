# Data Directory

## ⚠️ DO NOT DELETE THIS DIRECTORY

This directory is **required** for Docker Compose and should remain in the repository, even if empty.

## Purpose

This directory serves as a **Docker volume mount point** for the rbAI backend service.

## Technical Details

- **Docker Compose Configuration:** `docker-compose.yml` line 17
  ```yaml
  volumes:
    - ./rbai_server/data:/app/data
  ```

- **Dockerfile Configuration:** Creates this directory during image build
  ```dockerfile
  RUN mkdir -p /app/data /app/db
  ```

## What Goes Here?

This directory is intended for:
- Runtime data files (optional)
- Temporary application data
- Any files that need to persist between container restarts but aren't database files

Currently empty by design - the directory structure is what matters for Docker.

## Important Notes

- **Do not delete this directory** - removing it will cause `docker-compose up` to fail
- Database files belong in `../db/`, not here
- This directory is safe to keep empty
- It's excluded from the `.copilotignore` to prevent confusion with AI assistants

---

**Last Updated:** February 26, 2026
