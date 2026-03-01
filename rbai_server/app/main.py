# app/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import os
from .api.endpoints import execution, telemetry, chat, ai_generate, activities, auth, analytics, sessions
from .db.database import init_db, SessionLocal
from .db.seed import seed_database

logger = logging.getLogger(__name__)

# Initialize rate limiter with default limits
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"]  # Global default: 100 requests per minute
)

app = FastAPI(title="rbAI Backend", version="1.0.0")

# Global exception handler to prevent information leakage
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return generic error."""
    # Log the full error for debugging
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    
    # Return generic error to client (don't expose internal details)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."}
    )

# Add rate limit exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable gzip compression for responses (reduces bandwidth by ~60-80%)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS configuration - supports both development and production
allowed_origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative dev port
    "http://localhost",       # Production nginx (port 80)
]

# Add production origins from environment variable
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)
    # Also add with trailing slash variant
    if not frontend_url.endswith("/"):
        allowed_origins.append(f"{frontend_url}/")

# Add Railway-specific domains if detected
railway_static_url = os.getenv("RAILWAY_STATIC_URL")
if railway_static_url:
    allowed_origins.append(f"https://{railway_static_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Use the dynamically built list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """
    Initialize database on startup.
    Only seeds if database is empty (first run).
    """
    from app.db.models import User
    
    # Always ensure tables exist
    init_db()
    
    # Only seed if no users exist (first run)
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print("📊 No users found - seeding database with default accounts...")
            seed_database()
        else:
            print(f"📊 Database already populated ({user_count} users)")
    except Exception as e:
        print(f"⚠️  Could not check database: {e}")
    finally:
        db.close()

# Include routers
app.include_router(auth.router)
app.include_router(execution.router)
app.include_router(telemetry.router)
app.include_router(chat.router)
app.include_router(ai_generate.router, prefix="/api/ai", tags=["AI Generation"])
app.include_router(activities.router, prefix="/api", tags=["Activities"])
app.include_router(analytics.router)
app.include_router(sessions.router)

@app.get("/")
async def root():
    return {"message": "rbAI Backend API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "rbAI"}

@app.get("/metrics")
async def metrics():
    """Database connection pool metrics for monitoring concurrency"""
    from .db.database import engine
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_out_connections": pool.checkedout(),
        "overflow_connections": pool.overflow(),
        "total_connections": pool.size() + pool.overflow()
    }